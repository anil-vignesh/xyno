import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True,
)
def send_event_email(self, event_id: int, recipient: str, context_data: dict):
    from events.models import Event
    from logs.models import EmailLog

    try:
        event = Event.objects.select_related('template', 'integration').get(id=event_id)
    except Event.DoesNotExist:
        logger.error(f"Event {event_id} not found")
        return

    template = event.template
    integration = event.integration

    rendered_subject, rendered_html = template.render(context_data)

    log_entry = EmailLog.objects.create(
        event=event,
        template=template,
        integration=integration,
        user=event.user,
        recipient=recipient,
        subject=rendered_subject,
        status='pending',
        metadata={
            'context_data': context_data,
            'task_id': self.request.id,
        },
    )

    try:
        client = integration.get_ses_client()
        response = client.send_raw_email(
            Source=integration.sender_email,
            Destinations=[recipient],
            RawMessage={
                'Data': _build_mime_message(
                    integration.sender_email, recipient,
                    rendered_subject, rendered_html,
                ),
            },
        )
        ses_message_id = response['MessageId']
        log_entry.status = 'sent'
        log_entry.ses_message_id = ses_message_id
        log_entry.save(update_fields=['status', 'ses_message_id'])
        logger.info(f"Email sent: {ses_message_id} to {recipient}")

    except Exception as exc:
        log_entry.status = 'failed'
        log_entry.error_message = str(exc)
        log_entry.save(update_fields=['status', 'error_message'])
        logger.error(f"Email failed for {recipient}: {exc}")
        raise self.retry(exc=exc)


def _build_mime_message(sender: str, recipient: str, subject: str, html: str) -> str:
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = recipient
    msg.attach(MIMEText(html, 'html'))
    return msg.as_string()

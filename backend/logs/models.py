from django.conf import settings
from django.db import models


class EmailLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
        ('complained', 'Complained'),
    ]

    event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        related_name='logs',
    )
    template = models.ForeignKey(
        'templates_app.EmailTemplate',
        on_delete=models.SET_NULL,
        null=True,
        related_name='logs',
    )
    integration = models.ForeignKey(
        'integrations.SESIntegration',
        on_delete=models.SET_NULL,
        null=True,
        related_name='logs',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_logs',
    )
    recipient = models.EmailField(db_index=True)
    subject = models.CharField(max_length=500)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True,
    )
    ses_message_id = models.CharField(max_length=255, blank=True, db_index=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['user', '-sent_at']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.recipient} - {self.status} - {self.sent_at}"

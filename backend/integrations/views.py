from email.mime.text import MIMEText

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from xyno.utils import get_environment_from_request

from .models import SESIntegration
from .serializers import SESIntegrationCreateSerializer, SESIntegrationListSerializer


class SESIntegrationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        env = get_environment_from_request(self.request)
        return SESIntegration.objects.filter(user=self.request.user, environment=env)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SESIntegrationCreateSerializer
        return SESIntegrationListSerializer

    def perform_create(self, serializer):
        env = get_environment_from_request(self.request)
        serializer.save(user=self.request.user, environment=env)

    @action(detail=True, methods=['post'])
    def verify_sender(self, request, pk=None):
        """
        Mark sender as verified. Since many IAM users only have
        ses:SendRawEmail permission, we send a test email to validate
        the sender identity works. If it succeeds, the sender is verified.
        """
        integration = self.get_object()
        try:
            client = integration.get_ses_client()
            # Try ses:VerifyEmailIdentity first (full permissions)
            try:
                client.verify_email_identity(
                    EmailAddress=integration.sender_email
                )
                return Response({
                    'detail': (
                        'Verification email sent to '
                        + integration.sender_email
                        + '. Check your inbox and click the link.'
                    )
                })
            except client.exceptions.ClientError as e:
                error_code = e.response['Error'].get('Code', '')
                if error_code in ('AccessDenied', 'AccessDeniedException'):
                    # IAM user lacks VerifyEmailIdentity permission.
                    # Attempt a test send to prove credentials + sender work.
                    msg = MIMEText(
                        'This is a verification test from Xyno.',
                        'plain', 'utf-8',
                    )
                    msg['Subject'] = 'Xyno Sender Verification Test'
                    msg['From'] = integration.sender_email
                    msg['To'] = integration.sender_email
                    client.send_raw_email(
                        Source=integration.sender_email,
                        Destinations=[integration.sender_email],
                        RawMessage={'Data': msg.as_string()},
                    )
                    integration.is_verified = True
                    integration.save(update_fields=['is_verified'])
                    return Response({
                        'detail': (
                            'Test email sent successfully from '
                            + integration.sender_email
                            + '. Sender marked as verified.'
                        )
                    })
                raise
        except Exception as e:
            return Response({'detail': str(e)}, status=400)

    @action(detail=True, methods=['get'])
    def check_verification(self, request, pk=None):
        """
        Check if the sender email is verified in SES.
        Falls back to checking if we can send from the address.
        """
        integration = self.get_object()
        try:
            client = integration.get_ses_client()
            # Try GetIdentityVerificationAttributes first
            try:
                response = client.get_identity_verification_attributes(
                    Identities=[integration.sender_email]
                )
                attrs = response['VerificationAttributes'].get(
                    integration.sender_email, {}
                )
                is_verified = attrs.get('VerificationStatus') == 'Success'
                integration.is_verified = is_verified
                integration.save(update_fields=['is_verified'])
                return Response({'is_verified': is_verified})
            except client.exceptions.ClientError as e:
                error_code = e.response['Error'].get('Code', '')
                if error_code in ('AccessDenied', 'AccessDeniedException'):
                    # IAM user lacks this permission.
                    # Try sending a test email to verify sender works.
                    msg = MIMEText(
                        'Xyno verification check.', 'plain', 'utf-8'
                    )
                    msg['Subject'] = 'Xyno Verification Check'
                    msg['From'] = integration.sender_email
                    msg['To'] = integration.sender_email
                    client.send_raw_email(
                        Source=integration.sender_email,
                        Destinations=[integration.sender_email],
                        RawMessage={'Data': msg.as_string()},
                    )
                    integration.is_verified = True
                    integration.save(update_fields=['is_verified'])
                    return Response({'is_verified': True})
                raise
        except Exception as e:
            return Response({'detail': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """
        Test SES connection by trying get_send_quota first.
        Falls back to sending a test email via send_raw_email
        if the IAM user only has send permissions.
        """
        integration = self.get_object()
        try:
            client = integration.get_ses_client()
            # Try get_send_quota for full account info
            try:
                quota = client.get_send_quota()
                return Response({
                    'success': True,
                    'detail': (
                        f"Connected! Rate: {quota['MaxSendRate']}/sec, "
                        f"Sent today: {int(quota['SentLast24Hours'])}/"
                        f"{int(quota['Max24HourSend'])}"
                    ),
                })
            except client.exceptions.ClientError as e:
                error_code = e.response['Error'].get('Code', '')
                if error_code in ('AccessDenied', 'AccessDeniedException'):
                    # Fallback: test by sending a real email
                    msg = MIMEText(
                        'This is a connection test from Xyno. '
                        'Your SES integration is working correctly.',
                        'plain', 'utf-8',
                    )
                    msg['Subject'] = 'Xyno Connection Test'
                    msg['From'] = integration.sender_email
                    msg['To'] = integration.sender_email
                    result = client.send_raw_email(
                        Source=integration.sender_email,
                        Destinations=[integration.sender_email],
                        RawMessage={'Data': msg.as_string()},
                    )
                    message_id = result.get('MessageId', 'unknown')
                    # Also mark as verified since sending worked
                    if not integration.is_verified:
                        integration.is_verified = True
                        integration.save(update_fields=['is_verified'])
                    return Response({
                        'success': True,
                        'detail': (
                            f'Connection verified! Test email sent '
                            f'(Message ID: {message_id[:12]}...)'
                        ),
                    })
                raise
        except Exception as e:
            return Response(
                {'success': False, 'detail': str(e)}, status=400
            )

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import PlatformSESConfig, SESIntegration

logger = logging.getLogger(__name__)

from .models import APIKey, InviteToken, Organization, PasswordResetToken
from .permissions import IsAdminRole
from .serializers import (
    APIKeyCreateSerializer,
    APIKeyListSerializer,
    ForgotPasswordSerializer,
    InviteUserSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    SetPasswordSerializer,
    UserManagementSerializer,
    UserSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _send_invite_email(integration, recipient_email, first_name, invite_url):
    """Send an HTML invite email via the given SES integration."""
    html = f"""
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">You've been invited to Xyno</h2>
      <p>Hi {first_name},</p>
      <p>An admin has invited you to join the Xyno Email Management Platform.</p>
      <p style="margin: 24px 0;">
        <a href="{invite_url}"
           style="background: #0f172a; color: #fff; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 600;">
          Set Your Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy this link: <a href="{invite_url}">{invite_url}</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link expires in 72 hours. If you didn't expect this email, you can safely ignore it.
      </p>
    </body>
    </html>
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'You have been invited to Xyno'
    msg['From'] = integration.sender_email
    msg['To'] = recipient_email
    msg.attach(MIMEText(html, 'html'))

    client = integration.get_ses_client()
    client.send_raw_email(
        Source=integration.sender_email,
        Destinations=[recipient_email],
        RawMessage={'Data': msg.as_string()},
    )


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class RegistrationStatusView(APIView):
    """Returns whether public registration is currently open (no org exists yet)."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'registration_open': not Organization.objects.exists()})


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class UserProfileView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


# ---------------------------------------------------------------------------
# API Key views
# ---------------------------------------------------------------------------

class APIKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return APIKey.objects.filter(user__organization=self.request.user.organization)

    def get_serializer_class(self):
        if self.action == 'create':
            return APIKeyCreateSerializer
        return APIKeyListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_key = APIKey.generate_key()
        hashed_key = APIKey.hash_key(raw_key)

        environment = request.data.get('environment', 'sandbox')
        if environment not in ('sandbox', 'production'):
            environment = 'sandbox'

        # Developers cannot create production API keys
        if request.user.role == 'developer' and environment == 'production':
            return Response(
                {'detail': 'Developers cannot create production API keys.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        api_key = APIKey.objects.create(
            key=hashed_key,
            prefix=raw_key[:8],
            name=serializer.validated_data['name'],
            environment=environment,
            user=request.user,
        )

        response_data = APIKeyListSerializer(api_key).data
        response_data['raw_key'] = raw_key

        return Response(response_data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.delete()


# ---------------------------------------------------------------------------
# User management views (admin-only)
# ---------------------------------------------------------------------------

class UserManagementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = UserManagementSerializer
    # No POST — use InviteUserView instead
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return User.objects.filter(
            organization=self.request.user.organization
        ).exclude(id=self.request.user.id).order_by('created_at')


class InviteUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = InviteUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Auto-generate a unique username from the email prefix
        base_username = data['email'].split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create the inactive user — inherit the admin's organization
        invited_user = User(
            username=username,
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data.get('phone', ''),
            role=data['role'],
            organization=request.user.organization,
            is_active=False,
        )
        invited_user.set_unusable_password()
        invited_user.save()

        # Create (or replace) the invite token atomically
        with transaction.atomic():
            InviteToken.objects.filter(user=invited_user).delete()
            token_obj = InviteToken.objects.create(user=invited_user)

        # Build the set-password URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{frontend_url}/set-password?token={token_obj.token}"

        # Use platform SES config first; fall back to admin's own integration
        ses = PlatformSESConfig.objects.filter(is_active=True).first()
        if not ses:
            ses = SESIntegration.objects.filter(
                user=request.user,
                environment='sandbox',
                is_active=True,
                is_verified=True,
            ).first()

        warning = None
        if ses:
            try:
                _send_invite_email(ses, data['email'], data['first_name'], invite_url)
            except Exception as exc:
                logger.error(f"Failed to send invite email to {data['email']}: {exc}")
                warning = f"User created but invite email failed: {exc}"
        else:
            warning = (
                "No active SES configuration found. "
                "Share the invite link below manually."
            )

        response_data = UserManagementSerializer(invited_user).data
        response_data['invite_url'] = invite_url
        if warning:
            response_data['warning'] = warning

        return Response(response_data, status=status.HTTP_201_CREATED)


class SetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data['token']
        try:
            token_obj = InviteToken.objects.select_related('user').get(token=token_value)
        except InviteToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {'detail': 'Token has expired or has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.set_password(serializer.validated_data['password'])
        user.is_active = True
        user.save(update_fields=['password', 'is_active'])

        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        return Response({'detail': 'Password set successfully. You can now log in.'})


# ---------------------------------------------------------------------------
# Forgot / Reset password views
# ---------------------------------------------------------------------------

def _send_reset_email(integration, recipient_email, reset_url):
    """Send an HTML password-reset email via the given SES integration."""
    html = f"""
    <html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Reset your Xyno password</h2>
      <p>We received a request to reset the password for your Xyno account.</p>
      <p style="margin: 24px 0;">
        <a href="{reset_url}"
           style="background: #0f172a; color: #fff; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 600;">
          Reset Your Password
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        Or copy this link: <a href="{reset_url}">{reset_url}</a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore
        this email.
      </p>
    </body>
    </html>
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Reset your Xyno password'
    msg['From'] = integration.sender_email
    msg['To'] = recipient_email
    msg.attach(MIMEText(html, 'html'))

    client = integration.get_ses_client()
    client.send_raw_email(
        Source=integration.sender_email,
        Destinations=[recipient_email],
        RawMessage={'Data': msg.as_string()},
    )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        # Always return the same response — never reveal if the email exists
        generic_response = Response(
            {'detail': 'If an account with that email exists, a reset link has been sent.'}
        )

        user = User.objects.filter(email=email, is_active=True).first()
        if not user:
            return generic_response

        # Create a reset token
        token_obj = PasswordResetToken.objects.create(user=user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password?token={token_obj.token}"

        # Use platform SES config first; fall back to any org member's integration
        ses = PlatformSESConfig.objects.filter(is_active=True).first()
        if not ses:
            ses = SESIntegration.objects.filter(
                user__organization=user.organization,
                environment='sandbox',
                is_active=True,
                is_verified=True,
            ).first()

        if ses:
            try:
                _send_reset_email(ses, email, reset_url)
            except Exception as exc:
                logger.error(f"Failed to send password reset email to {email}: {exc}")

        return generic_response


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_value = serializer.validated_data['token']
        try:
            token_obj = PasswordResetToken.objects.select_related('user').get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {'detail': 'Token has expired or has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.set_password(serializer.validated_data['password'])
        user.save(update_fields=['password'])

        token_obj.is_used = True
        token_obj.save(update_fields=['is_used'])

        return Response({'detail': 'Password reset successfully. You can now log in.'})

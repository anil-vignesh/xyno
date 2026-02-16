from django.conf import settings
from django.db import models

from .encryption import decrypt_value, encrypt_value


class SESIntegration(models.Model):
    AWS_REGIONS = [
        ('us-east-1', 'US East (N. Virginia)'),
        ('us-east-2', 'US East (Ohio)'),
        ('us-west-1', 'US West (N. California)'),
        ('us-west-2', 'US West (Oregon)'),
        ('eu-west-1', 'EU (Ireland)'),
        ('eu-west-2', 'EU (London)'),
        ('eu-central-1', 'EU (Frankfurt)'),
        ('ap-south-1', 'Asia Pacific (Mumbai)'),
        ('ap-southeast-1', 'Asia Pacific (Singapore)'),
        ('ap-southeast-2', 'Asia Pacific (Sydney)'),
        ('ap-northeast-1', 'Asia Pacific (Tokyo)'),
    ]

    name = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ses_integrations',
    )
    aws_access_key_encrypted = models.TextField()
    aws_secret_key_encrypted = models.TextField()
    region = models.CharField(max_length=20, choices=AWS_REGIONS)
    sender_email = models.EmailField()
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.name} ({self.sender_email})"

    def set_aws_credentials(self, access_key: str, secret_key: str):
        self.aws_access_key_encrypted = encrypt_value(access_key)
        self.aws_secret_key_encrypted = encrypt_value(secret_key)

    def get_aws_access_key(self) -> str:
        return decrypt_value(self.aws_access_key_encrypted)

    def get_aws_secret_key(self) -> str:
        return decrypt_value(self.aws_secret_key_encrypted)

    def get_ses_client(self):
        import boto3
        return boto3.client(
            'ses',
            aws_access_key_id=self.get_aws_access_key(),
            aws_secret_access_key=self.get_aws_secret_key(),
            region_name=self.region,
        )

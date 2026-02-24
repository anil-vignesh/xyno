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

    ENVIRONMENT_CHOICES = [
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ]

    name = models.CharField(max_length=255)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ses_integrations',
    )
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='sandbox',
        db_index=True,
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
        unique_together = ['user', 'name', 'environment']

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


class PlatformS3Config(models.Model):
    """Singleton platform-level S3 config for org media storage (images, etc.)"""

    AWS_REGIONS = SESIntegration.AWS_REGIONS

    aws_access_key_encrypted = models.TextField()
    aws_secret_key_encrypted = models.TextField()
    region = models.CharField(max_length=20, choices=AWS_REGIONS)
    bucket_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform S3 Configuration'
        verbose_name_plural = 'Platform S3 Configuration'

    def __str__(self):
        return f'Platform S3 ({self.bucket_name})'

    def save(self, *args, **kwargs):
        if not self.pk and PlatformS3Config.objects.exists():
            raise ValueError('Only one Platform S3 Configuration is allowed.')
        super().save(*args, **kwargs)

    def set_aws_credentials(self, access_key: str, secret_key: str):
        self.aws_access_key_encrypted = encrypt_value(access_key)
        self.aws_secret_key_encrypted = encrypt_value(secret_key)

    def get_aws_access_key(self) -> str:
        return decrypt_value(self.aws_access_key_encrypted)

    def get_aws_secret_key(self) -> str:
        return decrypt_value(self.aws_secret_key_encrypted)

    def get_s3_client(self):
        import boto3
        return boto3.client(
            's3',
            aws_access_key_id=self.get_aws_access_key(),
            aws_secret_access_key=self.get_aws_secret_key(),
            region_name=self.region,
        )

    def upload_file(self, file_obj, key: str) -> str:
        """Upload a file-like object to S3 and return its public URL."""
        client = self.get_s3_client()
        client.upload_fileobj(
            file_obj,
            self.bucket_name,
            key,
            ExtraArgs={'ACL': 'public-read'},
        )
        return f'https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{key}'


class PlatformSESConfig(models.Model):
    """Singleton platform-level SES config for all system emails (invites, password reset, etc.)"""

    aws_access_key_encrypted = models.TextField()
    aws_secret_key_encrypted = models.TextField()
    region = models.CharField(max_length=20, choices=SESIntegration.AWS_REGIONS)
    sender_email = models.EmailField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform SES Configuration'
        verbose_name_plural = 'Platform SES Configuration'

    def __str__(self):
        return f'Platform SES ({self.sender_email})'

    def save(self, *args, **kwargs):
        # Enforce singleton — only one record allowed
        if not self.pk and PlatformSESConfig.objects.exists():
            raise ValueError('Only one Platform SES Configuration is allowed.')
        super().save(*args, **kwargs)

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

import hashlib
import secrets
import uuid
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Organization(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('developer', 'Developer'),
    ]

    company_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='developer')
    phone = models.CharField(max_length=20, blank=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email or self.username


class APIKey(models.Model):
    ENVIRONMENT_CHOICES = [
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ]

    key = models.CharField(max_length=64, unique=True, db_index=True)
    prefix = models.CharField(max_length=8)
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_keys')
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='sandbox',
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"

    @classmethod
    def generate_key(cls):
        return secrets.token_urlsafe(48)

    @classmethod
    def hash_key(cls, raw_key):
        return hashlib.sha256(raw_key.encode()).hexdigest()


class InviteToken(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='invite_token',
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=72)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"InviteToken for {self.user}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"PasswordResetToken for {self.user}"

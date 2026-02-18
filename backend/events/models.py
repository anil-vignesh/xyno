from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Event(models.Model):
    ENVIRONMENT_CHOICES = [
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ]

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    template = models.ForeignKey(
        'templates_app.EmailTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    integration = models.ForeignKey(
        'integrations.SESIntegration',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='events',
    )
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='sandbox',
        db_index=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'slug', 'environment']

    def __str__(self):
        return f"{self.name} ({self.slug})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name).replace('-', '_')
        super().save(*args, **kwargs)

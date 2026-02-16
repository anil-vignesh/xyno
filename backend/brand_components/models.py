from django.conf import settings
from django.db import models


class BrandComponent(models.Model):
    CATEGORY_CHOICES = [
        ('header', 'Header'),
        ('footer', 'Footer'),
        ('content', 'Content Block'),
        ('logo', 'Logo / Image'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='other',
    )
    html_content = models.TextField(
        help_text='The HTML snippet for this component',
    )
    thumbnail_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Optional preview image URL',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='brand_components',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'

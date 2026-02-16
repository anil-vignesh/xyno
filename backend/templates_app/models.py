import re

from django.conf import settings
from django.db import models


class EmailTemplate(models.Model):
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=500)
    html_content = models.TextField(blank=True)
    design_json = models.JSONField(null=True, blank=True)
    placeholders = models.JSONField(default=list, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='email_templates',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return self.name

    def _extract_placeholder_names(self) -> list[str]:
        """Extract all {{variable}} names from subject and html_content."""
        text = (self.subject or '') + (self.html_content or '')
        return sorted(set(re.findall(r'\{\{(\w+)\}\}', text)))

    def _get_defaults_map(self) -> dict[str, str]:
        """Build a map of placeholder_name -> default_value from current data."""
        defaults = {}
        for entry in (self.placeholders or []):
            if isinstance(entry, dict):
                defaults[entry.get('name', '')] = entry.get('default_value', '')
            elif isinstance(entry, str):
                # Legacy format migration
                defaults[entry] = ''
        return defaults

    def sync_placeholders(self):
        """
        Merge auto-detected placeholders from content with any
        user-defined defaults. New placeholders get empty defaults,
        removed placeholders are dropped, existing defaults are kept.
        """
        detected = self._extract_placeholder_names()
        existing_defaults = self._get_defaults_map()
        self.placeholders = [
            {'name': name, 'default_value': existing_defaults.get(name, '')}
            for name in detected
        ]

    def save(self, *args, **kwargs):
        self.sync_placeholders()
        super().save(*args, **kwargs)

    def get_placeholder_names(self) -> list[str]:
        """Return just the placeholder name strings."""
        return [
            p['name'] if isinstance(p, dict) else p
            for p in (self.placeholders or [])
        ]

    def render(self, context: dict) -> tuple:
        """
        Render template with context. Falls back to default_value
        for any placeholder not provided in context.
        """
        # Build full context: defaults first, then overrides
        defaults = self._get_defaults_map()
        merged = {**defaults, **context}

        subject = self.subject
        html = self.html_content
        for key, value in merged.items():
            placeholder = '{{' + key + '}}'
            subject = subject.replace(placeholder, str(value))
            html = html.replace(placeholder, str(value))
        return subject, html

from rest_framework import serializers

from .models import EmailLog


class EmailLogSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True, default=None)
    event_slug = serializers.CharField(source='event.slug', read_only=True, default=None)
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    integration_name = serializers.CharField(source='integration.name', read_only=True, default=None)

    class Meta:
        model = EmailLog
        fields = [
            'id', 'event', 'event_name', 'event_slug',
            'template', 'template_name',
            'integration', 'integration_name',
            'recipient', 'subject', 'status',
            'ses_message_id', 'error_message',
            'metadata', 'sent_at',
        ]

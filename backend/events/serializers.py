from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True, default=None)
    integration_name = serializers.CharField(source='integration.name', read_only=True, default=None)

    class Meta:
        model = Event
        fields = [
            'id', 'name', 'slug', 'description', 'environment',
            'template', 'template_name',
            'integration', 'integration_name',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']


class TriggerEventSerializer(serializers.Serializer):
    event = serializers.SlugField()
    recipient = serializers.EmailField()
    data = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False, default=dict)


class TestEventSerializer(serializers.Serializer):
    recipient = serializers.EmailField()
    data = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False, default=dict)

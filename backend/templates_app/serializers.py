from rest_framework import serializers

from .models import EmailTemplate


class PlaceholderSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    default_value = serializers.CharField(allow_blank=True, default='')


class EmailTemplateSerializer(serializers.ModelSerializer):
    placeholders = PlaceholderSerializer(many=True, read_only=True)

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'environment', 'subject', 'html_content', 'design_json',
            'placeholders', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'placeholders', 'created_at', 'updated_at']


class EmailTemplateListSerializer(serializers.ModelSerializer):
    placeholders = PlaceholderSerializer(many=True, read_only=True)

    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'environment', 'subject', 'placeholders',
            'is_active', 'created_at', 'updated_at',
        ]


class PlaceholderDefaultsSerializer(serializers.Serializer):
    """Accept a list of placeholder default value updates."""
    placeholders = PlaceholderSerializer(many=True)


class TemplatePreviewSerializer(serializers.Serializer):
    context = serializers.DictField(child=serializers.CharField(), required=False, default=dict)


class TemplateUploadSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    subject = serializers.CharField(max_length=500)
    html_content = serializers.CharField()

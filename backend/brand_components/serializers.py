from rest_framework import serializers

from .models import BrandComponent


class BrandComponentSerializer(serializers.ModelSerializer):
    """Full serializer for detail / create / update."""
    category_display = serializers.CharField(
        source='get_category_display', read_only=True,
    )

    class Meta:
        model = BrandComponent
        fields = [
            'id', 'name', 'category', 'category_display',
            'html_content', 'thumbnail_url',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'category_display', 'created_at', 'updated_at']


class BrandComponentListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list view — omits html_content."""
    category_display = serializers.CharField(
        source='get_category_display', read_only=True,
    )

    class Meta:
        model = BrandComponent
        fields = [
            'id', 'name', 'category', 'category_display',
            'thumbnail_url', 'is_active', 'created_at', 'updated_at',
        ]

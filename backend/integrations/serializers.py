from rest_framework import serializers

from .models import SESIntegration


class SESIntegrationCreateSerializer(serializers.ModelSerializer):
    aws_access_key = serializers.CharField(write_only=True)
    aws_secret_key = serializers.CharField(write_only=True)

    class Meta:
        model = SESIntegration
        fields = [
            'id', 'name', 'aws_access_key', 'aws_secret_key',
            'region', 'sender_email', 'is_verified', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at']

    def create(self, validated_data):
        access_key = validated_data.pop('aws_access_key')
        secret_key = validated_data.pop('aws_secret_key')
        integration = SESIntegration(**validated_data)
        integration.set_aws_credentials(access_key, secret_key)
        integration.save()
        return integration

    def update(self, instance, validated_data):
        access_key = validated_data.pop('aws_access_key', None)
        secret_key = validated_data.pop('aws_secret_key', None)
        if access_key and secret_key:
            instance.set_aws_credentials(access_key, secret_key)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class SESIntegrationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SESIntegration
        fields = [
            'id', 'name', 'region', 'sender_email',
            'is_verified', 'is_active', 'created_at', 'updated_at',
        ]

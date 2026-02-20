from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import APIKey, Organization

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password_confirm', 'company_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        if Organization.objects.exists():
            raise serializers.ValidationError(
                'Registration is disabled. Please contact your admin for an invite.'
            )
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        company_name = validated_data.get('company_name') or validated_data.get('username', 'My Organization')
        with transaction.atomic():
            org, _ = Organization.objects.get_or_create(name=company_name)
            user = User(**validated_data)
            user.set_password(password)
            user.role = 'admin'
            user.organization = org
            user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name', 'phone',
            'company_name', 'role',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'role', 'created_at', 'updated_at']


class UserManagementSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name', 'phone',
            'role', 'is_active', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'username', 'created_at', 'status', 'is_active']

    def get_status(self, obj):
        return 'invited' if not obj.is_active else 'active'


class InviteUserSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(choices=['admin', 'developer'])

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value


class SetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data


class APIKeyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'prefix', 'environment', 'is_active', 'last_used_at', 'created_at']
        read_only_fields = ['id', 'prefix', 'is_active', 'last_used_at', 'created_at']


class APIKeyListSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIKey
        fields = ['id', 'name', 'prefix', 'environment', 'is_active', 'last_used_at', 'created_at']

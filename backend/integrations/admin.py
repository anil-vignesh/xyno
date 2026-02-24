from django import forms
from django.contrib import admin

from .models import PlatformS3Config, PlatformSESConfig, SESIntegration


@admin.register(SESIntegration)
class SESIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'region', 'sender_email', 'is_verified', 'is_active', 'created_at']
    list_filter = ['is_verified', 'is_active', 'region']
    readonly_fields = ['created_at', 'updated_at']


class PlatformSESConfigAdminForm(forms.ModelForm):
    aws_access_key = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        label='AWS Access Key (plain text)',
        help_text='Enter plain-text key — will be encrypted on save. Leave blank to keep existing.',
    )
    aws_secret_key = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        label='AWS Secret Key (plain text)',
        help_text='Enter plain-text key — will be encrypted on save. Leave blank to keep existing.',
    )

    class Meta:
        model = PlatformSESConfig
        fields = ['aws_access_key', 'aws_secret_key', 'region', 'sender_email', 'is_active']


@admin.register(PlatformSESConfig)
class PlatformSESConfigAdmin(admin.ModelAdmin):
    form = PlatformSESConfigAdminForm
    list_display = ['sender_email', 'region', 'is_active', 'created_at']
    readonly_fields = ['aws_access_key_encrypted', 'aws_secret_key_encrypted', 'created_at', 'updated_at']

    def has_add_permission(self, request):
        # Enforce singleton — only allow adding if no record exists yet
        return not PlatformSESConfig.objects.exists()

    def save_model(self, request, obj, form, change):
        access_key = form.cleaned_data.get('aws_access_key', '').strip()
        secret_key = form.cleaned_data.get('aws_secret_key', '').strip()
        if access_key and secret_key:
            obj.set_aws_credentials(access_key, secret_key)
        super().save_model(request, obj, form, change)


class PlatformS3ConfigAdminForm(forms.ModelForm):
    aws_access_key = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        label='AWS Access Key (plain text)',
        help_text='Enter plain-text key — will be encrypted on save. Leave blank to keep existing.',
    )
    aws_secret_key = forms.CharField(
        required=False,
        widget=forms.PasswordInput(render_value=False),
        label='AWS Secret Key (plain text)',
        help_text='Enter plain-text key — will be encrypted on save. Leave blank to keep existing.',
    )

    class Meta:
        model = PlatformS3Config
        fields = ['aws_access_key', 'aws_secret_key', 'region', 'bucket_name', 'is_active']


@admin.register(PlatformS3Config)
class PlatformS3ConfigAdmin(admin.ModelAdmin):
    form = PlatformS3ConfigAdminForm
    list_display = ['bucket_name', 'region', 'is_active', 'created_at']
    readonly_fields = ['aws_access_key_encrypted', 'aws_secret_key_encrypted', 'created_at', 'updated_at']

    def has_add_permission(self, request):
        return not PlatformS3Config.objects.exists()

    def save_model(self, request, obj, form, change):
        access_key = form.cleaned_data.get('aws_access_key', '').strip()
        secret_key = form.cleaned_data.get('aws_secret_key', '').strip()
        if access_key and secret_key:
            obj.set_aws_credentials(access_key, secret_key)
        super().save_model(request, obj, form, change)

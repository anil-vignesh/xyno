from django.contrib import admin

from .models import SESIntegration


@admin.register(SESIntegration)
class SESIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'region', 'sender_email', 'is_verified', 'is_active', 'created_at']
    list_filter = ['is_verified', 'is_active', 'region']
    readonly_fields = ['created_at', 'updated_at']

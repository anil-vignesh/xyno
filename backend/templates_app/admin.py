from django.contrib import admin

from .models import EmailTemplate


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'user', 'is_active', 'updated_at']
    list_filter = ['is_active']
    readonly_fields = ['placeholders', 'created_at', 'updated_at']

from django.contrib import admin

from .models import EmailLog


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'subject', 'status', 'event', 'integration', 'sent_at']
    list_filter = ['status', 'sent_at']
    readonly_fields = ['sent_at']
    search_fields = ['recipient', 'subject', 'ses_message_id']

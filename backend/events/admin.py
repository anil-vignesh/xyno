from django.contrib import admin

from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'user', 'template', 'integration', 'is_active', 'created_at']
    list_filter = ['is_active']
    readonly_fields = ['slug', 'created_at', 'updated_at']

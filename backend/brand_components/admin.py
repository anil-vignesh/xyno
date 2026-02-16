from django.contrib import admin

from .models import BrandComponent


@admin.register(BrandComponent)
class BrandComponentAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'user', 'is_active', 'updated_at']
    list_filter = ['category', 'is_active']
    readonly_fields = ['created_at', 'updated_at']

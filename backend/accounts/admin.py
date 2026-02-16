from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import APIKey, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'company_name', 'is_active', 'created_at']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('company_name',)}),
    )


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'prefix', 'user', 'is_active', 'last_used_at', 'created_at']
    list_filter = ['is_active']
    readonly_fields = ['key', 'prefix', 'created_at']

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import APIKey, Organization, User


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['name', 'member_count', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at']

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'organization', 'is_active', 'created_at']
    list_filter = ['role', 'organization', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('company_name', 'role', 'phone', 'organization')}),
    )


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'prefix', 'user', 'is_active', 'last_used_at', 'created_at']
    list_filter = ['is_active']
    readonly_fields = ['key', 'prefix', 'created_at']

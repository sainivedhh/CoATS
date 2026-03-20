from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CoatsUserAdmin(UserAdmin):
    list_display  = ['username', 'role', 'branch', 'first_name', 'last_name', 'is_active']
    list_filter   = ['role', 'branch', 'is_active']
    search_fields = ['username', 'first_name', 'last_name']
    fieldsets     = UserAdmin.fieldsets + (
        ('COATS Info', {'fields': ('role', 'branch', 'photo')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('COATS Info', {'fields': ('role', 'branch', 'photo')}),
    )

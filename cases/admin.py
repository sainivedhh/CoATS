from django.contrib import admin
from .models import Case, CaseLog, CaseHandover, CaseProgress

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ['crime_number', 'branch', 'current_stage', 'current_officer', 'date_of_registration']
    list_filter  = ['branch', 'current_stage']
    search_fields = ['crime_number', 'complainant_name']

@admin.register(CaseProgress)
class CaseProgressAdmin(admin.ModelAdmin):
    list_display = ['case', 'officer', 'date_of_progress', 'is_completed', 'reminder_date']
    list_filter  = ['is_completed']

admin.site.register(CaseLog)
admin.site.register(CaseHandover)

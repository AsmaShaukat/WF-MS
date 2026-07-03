from django.contrib import admin
from .models import SubSection


@admin.register(SubSection)
class SubSectionAdmin(admin.ModelAdmin):
    list_display  = ('id', 'sub_section_name', 'section', 'head_employee', 'created_at')
    search_fields = ('sub_section_name',)
    list_filter   = ('section',)
    ordering      = ('-created_at',)

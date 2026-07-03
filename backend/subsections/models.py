from django.db import models
from django.utils import timezone


class SubSection(models.Model):
    sub_section_name = models.CharField(max_length=150)
    section          = models.ForeignKey(
                         'sections.Sections',
                         on_delete=models.CASCADE,
                         db_column='section_id',
                         related_name='sub_sections',
                       )
    head_employee    = models.ForeignKey(
                         'users.Employees',
                         on_delete=models.CASCADE,
                         db_column='head_employee_id',
                         related_name='headed_sub_sections',
                       )
    created_at       = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'sub_sections'
        ordering = ['-created_at']

    def __str__(self):
        return self.sub_section_name

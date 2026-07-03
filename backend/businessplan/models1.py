from django.db import models
from django.utils import timezone


class BusinessPlan(models.Model):
    """Level 0, 1, 2 tasks - hierarchical"""
    sr_number    = models.CharField(max_length=30, unique=True)  # T-IT-01, T-IT-01-01
    parent_sr    = models.CharField(max_length=30, null=True, blank=True)  # NULL = root
    level        = models.IntegerField(default=0)  # 0=L1, 1=L2, 2=L3
    section      = models.ForeignKey(
                       'sections.Sections',
                       on_delete=models.SET_NULL,
                       null=True,
                       blank=True,
                       db_column='section'
                   )
    task         = models.CharField(max_length=500)
    start_date   = models.DateField(null=True, blank=True)
    end_date     = models.DateField(null=True, blank=True)
    lead_team    = models.ForeignKey(
                       'sub_sections.SubSections',
                       on_delete=models.SET_NULL,
                       null=True,
                       blank=True,
                       db_column='lead_team_id',
                       related_name='lead_plans'
                   )
    support_team = models.CharField(max_length=100, blank=True)
    dependencies = models.CharField(max_length=200, blank=True)
    deliverables = models.CharField(max_length=200, blank=True)
    completion_pct = models.IntegerField(default=0)  # ALWAYS starts at 0
    created_by   = models.IntegerField()  # erpid of uploader
    created_at   = models.DateTimeField(default=timezone.now)
    uploaded_by_grade = models.IntegerField()  # grade_id of who uploaded

    class Meta:
        db_table = 'business_plan'
        ordering = ['sr_number']

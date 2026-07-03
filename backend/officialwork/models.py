from django.db import models
from django.utils import timezone
# Create your models here.


class OfficialWorkModel(models.Model):
    employee_id = models.IntegerField(default=0)
    erp_id = models.IntegerField(default=0)
    head_erpid = models.IntegerField(default=0)
    leave_type = models.CharField(max_length=50, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, default='Pending')
    approved_by = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'official_work_leaves'  # ✅ include schema

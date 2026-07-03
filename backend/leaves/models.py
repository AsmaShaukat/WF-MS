from django.db import models
from django.utils import timezone
# Create your models here.

class LeaveModel(models.Model):
    employee_id = models.IntegerField(default=0)
    erp_id = models.IntegerField(default=0)  # Assuming erp_id is an integer, adjust as necessary
    head_erpid = models.IntegerField(default=0)  # Assuming erp_id is an integer, adjust as necessary
    leave_type = models.CharField(max_length=50, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    total_days = models.IntegerField(default=0)
    reason = models.TextField(null=True, blank=True)
    approved_by = models.TextField(null=True, blank=True)
    entry_made_by = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='pending')  # e.g., Pending, Approved, Rejected
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'leaves'

class LeaveTypeCountModel(models.Model):
    leave_type = models.CharField(max_length=50, null=True, blank=True)
    total_leaves = models.IntegerField(default=0)

    class Meta:
        db_table = 'leave_type_counts'
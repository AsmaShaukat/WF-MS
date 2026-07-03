from django.db import models
from django.utils import timezone


class EmployeeActivity(models.Model):
    erp_id            = models.IntegerField()
    bp_task          = models.ForeignKey(
                         'businessplan.BusinessPlan',
                         on_delete=models.SET_NULL,
                         null=True, blank=True,
                         related_name='activities'
                       )
    task_description = models.TextField()
    risk_comment     = models.TextField(blank=True, default='')
    activity_date    = models.DateField()
    today_progress   = models.IntegerField(default=0)
    overall_pct      = models.IntegerField(default=0)
    status           = models.CharField(
                         max_length=20,
                         choices=[
                             ('In Progress', 'In Progress'),
                             ('Completed',   'Completed'),
                             ('Pending',     'Pending'),
                             ('Blocked',     'Blocked'),
                         ],
                         default='In Progress'
                       )
    created_at       = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'employee_activities'
        ordering = ['-created_at']
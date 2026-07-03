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
                       'subsections.SubSection',
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


# ─────────────────────────────────────────────────────────────
# Parent → child rollup for completion_pct
#
# Hierarchy is flat on this same model:
#   sr_number  -> this row's own id        (e.g. "T-IT-01-02")
#   parent_sr  -> sr_number of parent row  (NULL for root/L1 tasks)
#
# So children of task X = BusinessPlan.objects.filter(parent_sr=X.sr_number)
#
# Call recalc_chain_from_parent_sr(some_parent_sr) any time a task's
# completion_pct changes — it recomputes that parent as the average of
# its direct children, then walks one level up and repeats till the root.
# (Average is the rule for now — change it here if you ever need
# weighting, e.g. by sub-task duration or count of grandchildren.)
# ─────────────────────────────────────────────────────────────
def recalc_chain_from_parent_sr(parent_sr):
    while parent_sr:
        parent = BusinessPlan.objects.filter(sr_number=parent_sr).first()
        if not parent:
            break

        child_pcts = list(
            BusinessPlan.objects
            .filter(parent_sr=parent.sr_number)
            .values_list('completion_pct', flat=True)
        )

        new_pct = round(sum(child_pcts) / len(child_pcts)) if child_pcts else 0
        new_pct = max(0, min(100, new_pct))

        if new_pct != parent.completion_pct:
            BusinessPlan.objects.filter(pk=parent.pk).update(completion_pct=new_pct)

        parent_sr = parent.parent_sr  # move one level up


def sync_parent_completion(child):
    """Pass the BusinessPlan instance whose completion_pct just changed —
    its whole ancestor chain gets recomputed."""
    recalc_chain_from_parent_sr(child.parent_sr)
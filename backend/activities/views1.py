from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from django.utils import timezone
from .models import EmployeeActivity
import json
import datetime


# ─────────────────────────────────────────────────────────────
# HELPER: grade-9 head detection
# Returns list of SubSection objects if employee is a head, else []
# ─────────────────────────────────────────────────────────────
def _get_head_subsections(erp_id, section_id=None):
    """Return list of SubSections where erp_id is head. Empty list if not a head."""
    from subsections.models import SubSection
    return list(SubSection.objects.filter(head_employee_id=erp_id))


# ─────────────────────────────────────────────────────────────
# HELPER: keep BusinessPlan.completion_pct in sync with activities
#
# Root cause of the bug: submit_activity / update_activity were
# saving overall_pct on EmployeeActivity only — they never wrote
# back to BusinessPlan.completion_pct. So BusinessPlan.tsx,
# EmpDailyActivities.tsx and ActivitiesReport.tsx all kept showing
# a stale/zero completion_pct because the BP row itself never changed.
#
# This recomputes completion_pct from the most recent activity
# logged against that bp_task, and is called after every
# create / update / delete of an activity.
# ─────────────────────────────────────────────────────────────
def _sync_bp_completion(bp_task_id):
    if not bp_task_id:
        return
    from businessplan.models import BusinessPlan, sync_parent_completion

    latest = (
        EmployeeActivity.objects
        .filter(bp_task_id=bp_task_id)
        .order_by('-activity_date', '-created_at')
        .first()
    )
    new_pct = max(0, min(100, latest.overall_pct)) if latest else 0
    BusinessPlan.objects.filter(pk=bp_task_id).update(completion_pct=new_pct)

    # 🔧 FIX: agar yeh task kisi parent task ka sub-task hai, to parent
    # (aur uske upar wale chain) ki completion_pct bhi recompute karo —
    # parent = apne direct children ka average
    bp_task = BusinessPlan.objects.filter(pk=bp_task_id).first()
    if bp_task:
        sync_parent_completion(bp_task)


# ─────────────────────────────────────────────────────────────
# GET /activities/my/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_my_activities(request):
    erpid = request.GET.get('erp_id') or request.GET.get('erpid')
    if not erpid:
        return JsonResponse({'error': 'erp_id required'}, status=400)

    activities = EmployeeActivity.objects.filter(erp_id=int(erpid)).annotate(
        bp_task_sr=F('bp_task__sr_number'),
        bp_task_name=F('bp_task__task'),
        bp_task_start_date=F('bp_task__start_date'),
        bp_task_end_date=F('bp_task__end_date'),
    ).values(
        'id', 'erp_id', 'bp_task_id', 'bp_task_sr', 'bp_task_name',
        'bp_task_start_date', 'bp_task_end_date',
        'task_description', 'risk_comment', 'activity_date',
        'today_progress', 'overall_pct', 'status', 'created_at',
    )
    return JsonResponse(list(activities), safe=False)


# ─────────────────────────────────────────────────────────────
# POST /activities/submit/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def submit_activity(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data = json.loads(request.body)
        bp_task_id = data.get('bp_task_id') or None
        EmployeeActivity.objects.create(
            erp_id           = data.get('erp_id') or data.get('erpid'),
            bp_task_id       = bp_task_id,
            task_description = data.get('task_description', ''),
            risk_comment     = data.get('risk_comment', ''),
            activity_date    = data['activity_date'],
            today_progress   = data.get('today_progress', 0),
            overall_pct      = data.get('overall_pct', 0),
            status           = data.get('status', 'In Progress'),
        )
        # 🔧 FIX: BP task ki completion_pct ko activity ke overall_pct se sync karo
        _sync_bp_completion(bp_task_id)
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PUT /activities/update/<pk>/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def update_activity(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT only'}, status=405)
    try:
        data = json.loads(request.body)
        act = EmployeeActivity.objects.get(pk=pk)
        old_bp_task_id       = act.bp_task_id
        act.bp_task_id       = data.get('bp_task_id', act.bp_task_id)
        act.task_description = data.get('task_description', act.task_description)
        act.risk_comment     = data.get('risk_comment', act.risk_comment)
        act.activity_date    = data.get('activity_date', act.activity_date)
        act.today_progress   = data.get('today_progress', act.today_progress)
        act.overall_pct      = data.get('overall_pct', act.overall_pct)
        act.status           = data.get('status', act.status)
        act.save()
        # 🔧 FIX: BP completion_pct ko refresh karo — agar bp_task badla hai
        # to purane task ko bhi resync karo, taake woh stale na reh jaye
        if old_bp_task_id and old_bp_task_id != act.bp_task_id:
            _sync_bp_completion(old_bp_task_id)
        _sync_bp_completion(act.bp_task_id)
        return JsonResponse({'success': True})
    except EmployeeActivity.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# DELETE /activities/delete/<pk>/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def delete_activity(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        act = EmployeeActivity.objects.get(pk=pk)
        bp_task_id = act.bp_task_id
        act.delete()
        # 🔧 FIX: activity delete hone ke baad BP task ki completion_pct
        # ko remaining activities se resync karo (warna deleted activity
        # ki value BusinessPlan mein stuck reh jaati thi)
        _sync_bp_completion(bp_task_id)
        return JsonResponse({'success': True})
    except EmployeeActivity.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)


# ─────────────────────────────────────────────────────────────
# GET /activities/bp-tasks/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_bp_tasks(request):
    from businessplan.models import BusinessPlan
    section_id   = request.GET.get('section_id')
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'

    qs = BusinessPlan.objects.all()
    if not is_superuser and section_id and section_id != '0':
        qs = qs.filter(section_id=int(section_id))

    tasks = qs.values('id', 'sr_number', 'task', 'start_date', 'end_date', 'completion_pct')
    return JsonResponse(list(tasks), safe=False)


# ─────────────────────────────────────────────────────────────
# GET /activities/report/
#
# Access rules:
#   grade < 9            → only own activities
#   grade 9, NOT head    → only own activities
#   grade 9, IS head     → all employees of their sub_section(s)
#   grade 10/11          → all employees of their section
#   superuser            → everyone
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_activities_report(request):
    section_id   = request.GET.get('section_id')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    erp_id       = int(request.GET.get('erp_id', 0))

    # Optional filters from frontend
    filter_erpid   = request.GET.get('filter_erp_id') or request.GET.get('erpid')
    # Multi-select: getlist returns all values sent as sub_section_id
    filter_sub_secs = [x for x in request.GET.getlist('sub_section_id') if x]
    date_from      = request.GET.get('date_from')
    date_to        = request.GET.get('date_to')

    qs = EmployeeActivity.objects.annotate(
        bp_task__sr_number     = F('bp_task__sr_number'),
        bp_task__task          = F('bp_task__task'),
        bp_task__section__name = F('bp_task__section__name'),
        bp_task__start_date    = F('bp_task__start_date'),
        bp_task__end_date      = F('bp_task__end_date'),
    )

    # ── Determine scope ──────────────────────────────────────
    if is_superuser:
        pass  # no restriction

    elif grade_id in [10, 11]:
        if section_id and section_id != '0':
            qs = qs.filter(bp_task__section_id=int(section_id))
        else:
            # No valid section_id — return nothing (security: don't leak all data)
            return JsonResponse([], safe=False)

    elif grade_id == 9:
        head_sss = _get_head_subsections(erp_id, section_id)
        if head_sss:
            from users.models import Employees
            head_ss_ids = [ss.id for ss in head_sss]
            sub_emp_ids = list(
                Employees.objects.filter(sub_section_id__in=head_ss_ids).values_list('erp_id', flat=True)
            )
            qs = qs.filter(erp_id__in=sub_emp_ids)
            # Sub-section filter still applies if frontend sends specific sub_section(s)
            # but only within the head's allowed sub_sections
            if filter_sub_secs:
                allowed = [str(sid) for sid in head_ss_ids]
                filter_sub_secs = [s for s in filter_sub_secs if s in allowed]
        else:
            # Not a head → own activities only
            qs = qs.filter(erp_id=erp_id)
            filter_erpid    = None
            filter_sub_secs = []

    else:
        # Grade < 9 → own activities only
        qs = qs.filter(erp_id=erp_id)
        filter_erpid    = None
        filter_sub_secs = []

    # ── Optional frontend filters ─────────────────────────────
    if filter_sub_secs:
        from users.models import Employees
        sub_emp_ids = list(
            Employees.objects.filter(
                sub_section_id__in=[int(s) for s in filter_sub_secs]
            ).values_list('erp_id', flat=True)
        )
        qs = qs.filter(erp_id__in=sub_emp_ids)

    if filter_erpid:
        qs = qs.filter(erp_id=int(filter_erpid))

    if date_from:
        qs = qs.filter(activity_date__gte=date_from)
    if date_to:
        qs = qs.filter(activity_date__lte=date_to)

    # ── Fetch rows ───────────────────────────────────────────
    rows = list(qs.values(
        'id', 'erp_id',
        'bp_task__sr_number',
        'bp_task__task',
        'bp_task__section__name',
        'bp_task__start_date',
        'bp_task__end_date',
        'task_description', 'risk_comment', 'activity_date',
        'today_progress', 'overall_pct', 'status',
    ))

    # Build erp_id → name map
    erp_ids = list({r['erp_id'] for r in rows})
    try:
        from users.models import Employees
        emp_map = {
            e['erp_id']: e['name']
            for e in Employees.objects.filter(erp_id__in=erp_ids).values('erp_id', 'name')
        }
    except Exception:
        emp_map = {}

    for r in rows:
        r['employee_name'] = emp_map.get(r['erp_id'], str(r['erp_id']))

    return JsonResponse(rows, safe=False)


# ─────────────────────────────────────────────────────────────
# GET /activities/section-employees/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_section_employees(request):
    section_id   = request.GET.get('section_id')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    erp_id       = int(request.GET.get('erp_id', 0))

    try:
        from users.models import Employees

        if is_superuser:
            emps = Employees.objects.all()

        elif grade_id in [10, 11]:
            if section_id and section_id != '0':
                emps = Employees.objects.filter(section_id=int(section_id))
            else:
                emps = Employees.objects.none()

        elif grade_id == 9:
            head_sss = _get_head_subsections(erp_id, section_id)
            if head_sss:
                head_ss_ids = [ss.id for ss in head_sss]
                emps = Employees.objects.filter(sub_section_id__in=head_ss_ids)
            else:
                emps = Employees.objects.filter(erp_id=erp_id)

        else:
            emps = Employees.objects.filter(erp_id=erp_id)

        data = list(emps.values('erp_id', 'name', 'grade_id', 'sub_section_id'))
        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# GET /activities/sub-sections/
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_sub_sections(request):
    section_id   = request.GET.get('section_id')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    erp_id       = int(request.GET.get('erp_id', 0))

    try:
        from subsections.models import SubSection

        if is_superuser:
            ss_qs = SubSection.objects.all()

        elif grade_id in [10, 11]:
            if section_id and section_id != '0':
                ss_qs = SubSection.objects.filter(section_id=int(section_id))
            else:
                ss_qs = SubSection.objects.none()

        elif grade_id == 9:
            # Return ALL sub_sections where this employee is head (may be multiple)
            head_sss = _get_head_subsections(erp_id, section_id)
            if head_sss:
                head_ids = [ss.id for ss in head_sss]
                ss_qs = SubSection.objects.filter(pk__in=head_ids)
            else:
                ss_qs = SubSection.objects.none()

        else:
            ss_qs = SubSection.objects.none()

        data = list(ss_qs.values('id', 'sub_section_name', 'head_employee_id', 'section_id'))
        return JsonResponse(data, safe=False)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# GET /activities/attendance-report/
#
# "Kis section ke kitne aur konse employees ne aaj activity
# enter ki aur kin ne nahi ki" — sirf section-head (grade-9 head),
# grade-10/11 aur superuser ke liye. Individual employee (jo kisi
# sub_section ka head nahi hai) is endpoint se sirf apna data
# dekh sakta hai — usko frontend button hi show nahi hota, lekin
# yahan bhi wahi access-scope re-use kiya gaya hai jo
# get_sub_sections / get_section_employees mein hai, taake
# endpoint URL directly hit karke koi doosre section ka data na
# nikaal sake.
#
# Query params:
#   section_id, grade_id, is_superuser, erp_id   (same as baaki endpoints)
#   date   (YYYY-MM-DD, optional — default aaj ki date)
#
# Response: list of sub_sections, har ek ke andar employees ki
# list with 'active' flag (aaj/selected date activity submit ki
# ya nahi) + active/inactive counts.
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_attendance_report(request):
    section_id   = request.GET.get('section_id')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    erp_id       = int(request.GET.get('erp_id', 0))
    date_str     = request.GET.get('date')

    # Resolve target date (default: today)
    if date_str:
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'error': 'Invalid date format, expected YYYY-MM-DD'}, status=400)
    else:
        target_date = timezone.localdate()

    try:
        from subsections.models import SubSection
        from users.models import Employees

        # ── Determine which sub_sections this user is allowed to see ──
        if is_superuser:
            ss_qs = SubSection.objects.all()

        elif grade_id in [10, 11]:
            if section_id and section_id != '0':
                ss_qs = SubSection.objects.filter(section_id=int(section_id))
            else:
                ss_qs = SubSection.objects.none()

        elif grade_id == 9:
            head_sss = _get_head_subsections(erp_id, section_id)
            ss_qs = SubSection.objects.filter(pk__in=[ss.id for ss in head_sss]) if head_sss else SubSection.objects.none()

        else:
            # Individual employee (not a head) — no team to report on
            ss_qs = SubSection.objects.none()

        sub_sections = list(ss_qs.values('id', 'sub_section_name'))

        if not sub_sections:
            return JsonResponse({'date': str(target_date), 'sections': []}, safe=False)

        ss_ids = [ss['id'] for ss in sub_sections]

        # ── All employees belonging to these sub_sections ──
        employees = list(
            Employees.objects.filter(sub_section_id__in=ss_ids)
            .values('erp_id', 'name', 'sub_section_id')
        )
        all_erp_ids = [e['erp_id'] for e in employees]

        # ── Who submitted an activity on target_date ──
        active_erp_ids = set(
            EmployeeActivity.objects
            .filter(erp_id__in=all_erp_ids, activity_date=target_date)
            .values_list('erp_id', flat=True)
            .distinct()
        )

        # ── Group employees by sub_section ──
        emp_by_ss = {}
        for e in employees:
            emp_by_ss.setdefault(e['sub_section_id'], []).append(e)

        sections_out = []
        for ss in sub_sections:
            ss_employees = emp_by_ss.get(ss['id'], [])
            emp_list = []
            active_count = 0
            for e in ss_employees:
                is_active = e['erp_id'] in active_erp_ids
                if is_active:
                    active_count += 1
                emp_list.append({
                    'erp_id': e['erp_id'],
                    'name':   e['name'],
                    'active': is_active,
                })
            # Sort: inactive first (jinhe attention chahiye), phir active
            emp_list.sort(key=lambda x: (x['active'], x['name'] or ''))

            sections_out.append({
                'sub_section_id':   ss['id'],
                'sub_section_name': ss['sub_section_name'],
                'total_count':      len(ss_employees),
                'active_count':     active_count,
                'inactive_count':   len(ss_employees) - active_count,
                'employees':        emp_list,
            })

        return JsonResponse({'date': str(target_date), 'sections': sections_out}, safe=False)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
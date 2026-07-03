from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import EmployeeActivity
from businessplan.models import BusinessPlan
import json


# ─── Helper: Parent tasks ko update karo recursively ─────────────────────────
def update_parent_completion(sr_number):
    try:
        task = BusinessPlan.objects.get(sr_number=sr_number)
    except BusinessPlan.DoesNotExist:
        return
    if not task.parent_sr:
        return
    try:
        parent = BusinessPlan.objects.get(sr_number=task.parent_sr)
    except BusinessPlan.DoesNotExist:
        return
    children = BusinessPlan.objects.filter(parent_sr=parent.sr_number)
    if not children.exists():
        return
    total = sum(c.completion_pct for c in children)
    count = children.count()
    parent.completion_pct = round(total / count)
    parent.save()
    update_parent_completion(parent.sr_number)


# ─── BP Tasks dropdown ────────────────────────────────────────────────────────
@csrf_exempt
def get_bp_tasks(request):
    section_id   = request.GET.get('section_id')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'
    fields = ('id', 'sr_number', 'task', 'level', 'parent_sr',
              'department', 'start_date', 'end_date', 'completion_pct')
    if is_superuser:
        tasks = BusinessPlan.objects.all().values(*fields)
    elif section_id and section_id != '0':
        try:
            from sections.models import Sections
            section = Sections.objects.get(id=int(section_id))
            tasks = BusinessPlan.objects.filter(
                department__icontains=section.name
            ).values(*fields)
        except Exception:
            tasks = BusinessPlan.objects.all().values(*fields)
    else:
        tasks = BusinessPlan.objects.none().values(*fields)
    return JsonResponse(list(tasks), safe=False)


# ─── My Activities ────────────────────────────────────────────────────────────
@csrf_exempt
def get_my_activities(request):
    erpid = request.GET.get('erpid')
    if not erpid:
        return JsonResponse({'error': 'erpid required'}, status=400)
    activities = EmployeeActivity.objects.filter(erpid=int(erpid)).values(
        'id', 'erpid', 'bp_task_id',
        'bp_task__sr_number', 'bp_task__task',
        'bp_task__department',
        'bp_task__start_date', 'bp_task__end_date',
        'bp_task__completion_pct',
        'task_description', 'risk_comment',
        'activity_date', 'today_progress',
        'overall_pct', 'status', 'created_at'
    )
    return JsonResponse(list(activities), safe=False)


# ─── Activities Report ────────────────────────────────────────────────────────
@csrf_exempt
def get_activities_report(request):
    section_id   = request.GET.get('section_id', '0')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'
    filter_erpid = request.GET.get('erpid', '')
    date_from    = request.GET.get('date_from', '')
    date_to      = request.GET.get('date_to', '')
    filter_dept  = request.GET.get('department', '')

    try:
        from users.models import Employees

        # Allowed erpids based on grade + section
        if is_superuser:
            allowed_erpids = list(Employees.objects.values_list('erp_id', flat=True))
        elif grade_id in [9, 10, 11]:
            # Apne section ke sab
            allowed_erpids = list(
                Employees.objects.filter(section_id=int(section_id)).values_list('erp_id', flat=True)
            ) if section_id != '0' else []
        else:
            # Apne section ke grade <= apna grade
            allowed_erpids = list(
                Employees.objects.filter(
                    section_id=int(section_id),
                    grade_id__lte=grade_id
                ).values_list('erp_id', flat=True)
            ) if section_id != '0' else []

        # Activities query
        activities = EmployeeActivity.objects.filter(erpid__in=allowed_erpids)

        if filter_erpid:
            activities = activities.filter(erpid=int(filter_erpid))
        if date_from:
            activities = activities.filter(activity_date__gte=date_from)
        if date_to:
            activities = activities.filter(activity_date__lte=date_to)
        if filter_dept:
            activities = activities.filter(bp_task__department__icontains=filter_dept)

        result = activities.values(
            'id', 'erpid',
            'bp_task__sr_number', 'bp_task__task',
            'bp_task__department',
            'bp_task__start_date', 'bp_task__end_date',
            'task_description', 'risk_comment',
            'activity_date', 'today_progress',
            'overall_pct', 'status', 'created_at',
        ).order_by('-activity_date', '-created_at')

        # Employee name map
        emp_map = {
            str(e.erp_id): e.name
            for e in Employees.objects.filter(erp_id__in=allowed_erpids)
        }

        data = []
        for row in result:
            r = dict(row)
            r['employee_name'] = emp_map.get(str(row['erpid']), 'Unknown')
            # Convert dates to string
            for f in ['bp_task__start_date', 'bp_task__end_date']:
                if r.get(f) and not isinstance(r[f], str):
                    r[f] = str(r[f])
            if r.get('activity_date') and not isinstance(r['activity_date'], str):
                r['activity_date'] = str(r['activity_date'])
            if r.get('created_at'):
                r['created_at'] = str(r['created_at'])
            data.append(r)

        return JsonResponse(data, safe=False)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


# ─── Section Employees for report filter ─────────────────────────────────────
@csrf_exempt
def get_section_employees(request):
    section_id   = request.GET.get('section_id', '0')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'
    try:
        from users.models import Employees
        if is_superuser:
            emps = Employees.objects.all().values('erp_id', 'name', 'grade_id')
        elif grade_id in [9, 10, 11]:
            emps = Employees.objects.filter(
                section_id=int(section_id)
            ).values('erp_id', 'name', 'grade_id')
        else:
            emps = Employees.objects.filter(
                section_id=int(section_id),
                grade_id__lte=grade_id
            ).values('erp_id', 'name', 'grade_id')
        return JsonResponse(list(emps), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─── Submit Activity ──────────────────────────────────────────────────────────
@csrf_exempt
def submit_activity(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data       = json.loads(request.body)
        erpid      = data.get('erpid')
        bp_task_id = data.get('bp_task_id')
        desc       = data.get('task_description', '').strip()
        risk       = data.get('risk_comment', '')
        act_date   = data.get('activity_date')
        today_prog = int(data.get('today_progress', 0))

        if not desc or not act_date:
            return JsonResponse({'error': 'Description and date required'}, status=400)

        bp_task = None
        overall_pct = 0
        status = 'In Progress'

        if bp_task_id:
            try:
                bp_task = BusinessPlan.objects.get(id=int(bp_task_id))
                new_pct = min(100, bp_task.completion_pct + today_prog)
                bp_task.completion_pct = new_pct
                bp_task.save()
                update_parent_completion(bp_task.sr_number)
                overall_pct = new_pct
                status = 'Completed' if new_pct >= 100 else 'In Progress'
            except BusinessPlan.DoesNotExist:
                pass

        activity = EmployeeActivity.objects.create(
            erpid=erpid, bp_task=bp_task,
            task_description=desc, risk_comment=risk,
            activity_date=act_date,
            today_progress=today_prog,
            overall_pct=overall_pct, status=status,
        )
        return JsonResponse({'success': True, 'id': activity.id, 'overall_pct': overall_pct, 'status': status})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─── Update Activity ──────────────────────────────────────────────────────────
@csrf_exempt
def update_activity(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT only'}, status=405)
    try:
        data     = json.loads(request.body)
        activity = EmployeeActivity.objects.get(pk=pk)
        activity.task_description = data.get('task_description', activity.task_description)
        activity.risk_comment     = data.get('risk_comment', activity.risk_comment)
        today_prog = int(data.get('today_progress', activity.today_progress))

        if activity.bp_task:
            bp = activity.bp_task
            reversed_pct = max(0, bp.completion_pct - activity.today_progress)
            new_pct = min(100, reversed_pct + today_prog)
            bp.completion_pct = new_pct
            bp.save()
            update_parent_completion(bp.sr_number)
            activity.today_progress = today_prog
            activity.overall_pct = new_pct
            activity.status = 'Completed' if new_pct >= 100 else data.get('status', activity.status)
        else:
            activity.today_progress = today_prog
            activity.status = data.get('status', activity.status)

        activity.save()
        return JsonResponse({'success': True, 'overall_pct': activity.overall_pct})
    except EmployeeActivity.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─── Delete Activity ──────────────────────────────────────────────────────────
@csrf_exempt
def delete_activity(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        activity = EmployeeActivity.objects.get(pk=pk)
        if activity.bp_task:
            bp = activity.bp_task
            bp.completion_pct = max(0, bp.completion_pct - activity.today_progress)
            bp.save()
            update_parent_completion(bp.sr_number)
        activity.delete()
        return JsonResponse({'success': True})
    except EmployeeActivity.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
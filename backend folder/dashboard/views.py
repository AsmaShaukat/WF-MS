from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import date, timedelta
import json

@csrf_exempt
def department_dashboard(request):
    """
    Department Dashboard API
    Grade 9/10/11 + superuser ke liye
    Apne section ka overview
    """
    section_id   = request.GET.get('section_id', '0')
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'
    date_from    = request.GET.get('date_from', str(date.today()))
    date_to      = request.GET.get('date_to',   str(date.today()))
    admin_grades = [9, 10, 11]

    if not is_superuser and grade_id not in admin_grades:
        return JsonResponse({'error': 'Access denied'}, status=403)

    try:
        from users.models import Employees
        from sections.models import Sections
        from activities.models import EmployeeActivity
        from businessplan.models import BusinessPlan

        # Section name dhundo
        section_name = ''
        if section_id != '0':
            try:
                section = Sections.objects.get(id=int(section_id))
                section_name = section.name
            except Sections.DoesNotExist:
                pass

        # Section ke sab employees
        section_erpids = list(
            Employees.objects.filter(
                section_id=int(section_id)
            ).values_list('erp_id', flat=True)
        ) if section_id != '0' else []

        # 1. Total Employees
        total_employees = len(section_erpids)

        # 2. Activities in date range
        acts_qs = EmployeeActivity.objects.filter(
            erpid__in=section_erpids,
            activity_date__gte=date_from,
            activity_date__lte=date_to
        )
        total_activities = acts_qs.count()

        # 3. Risks
        risks_encountered = acts_qs.exclude(
            risk_comment__isnull=True
        ).exclude(risk_comment='').exclude(risk_comment='—').count()

        # 4. BP Tasks for this section
        if section_name:
            bp_qs = BusinessPlan.objects.filter(
                department__icontains=section_name
            )
        else:
            bp_qs = BusinessPlan.objects.none()

        total_bp_tasks   = bp_qs.count()
        completed_tasks  = bp_qs.filter(completion_pct=100).count()
        inprogress_tasks = bp_qs.filter(
            completion_pct__gt=0,
            completion_pct__lt=100
        ).count()
        not_started      = bp_qs.filter(completion_pct=0).count()

        # 5. Avg BP Completion
        avg_completion = 0
        if total_bp_tasks > 0:
            avg_completion = round(
                sum(t.completion_pct for t in bp_qs) / total_bp_tasks, 1
            )

        # 6. 7-Day Activity + Risk data
        seven_days = []
        for i in range(6, -1, -1):
            day     = date.today() - timedelta(days=i)
            day_str = str(day)
            day_qs  = EmployeeActivity.objects.filter(
                erpid__in=section_erpids,
                activity_date=day_str
            )
            day_risks = day_qs.exclude(
                risk_comment__isnull=True
            ).exclude(risk_comment='').exclude(risk_comment='—').count()

            seven_days.append({
                'date':       day_str,
                'day':        day.strftime('%a'),
                'activities': day_qs.count(),
                'risks':      day_risks,
            })

        return JsonResponse({
            'section_name':      section_name,
            'total_employees':   total_employees,
            'total_activities':  total_activities,
            'total_bp_tasks':    total_bp_tasks,
            'completed_tasks':   completed_tasks,
            'inprogress_tasks':  inprogress_tasks,
            'not_started':       not_started,
            'risks_encountered': risks_encountered,
            'avg_completion':    avg_completion,
            'seven_days':        seven_days,
            'date_from':         date_from,
            'date_to':           date_to,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

 
@csrf_exempt
def org_dashboard(request):
    """
    Organization Dashboard
    Sirf Grade 10/11 + Superuser ke liye
    Multiple sections ka overview
    """
    grade_id     = int(request.GET.get('grade_id', 0))
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'
    date_from    = request.GET.get('date_from', str(date.today()))
    date_to      = request.GET.get('date_to',   str(date.today()))
    # Comma separated section ids: "1,3,7"
    section_ids_param = request.GET.get('section_ids', '')
    allowed_grades = [10, 11]
 
    # Access check
    if not is_superuser and grade_id not in allowed_grades:
        return JsonResponse({'error': 'Access denied. Grade 10/11 required.'}, status=403)
 
    try:
        from users.models import Employees
        from sections.models import Sections
        from activities.models import EmployeeActivity
        from businessplan.models import BusinessPlan
 
        # Sab sections fetch karo
        all_sections = list(Sections.objects.all().values('id', 'name').order_by('name'))
 
        # Selected section ids parse karo
        if section_ids_param:
            selected_ids = [int(x) for x in section_ids_param.split(',') if x.strip().isdigit()]
        else:
            # Default: sab sections
            selected_ids = [s['id'] for s in all_sections]
 
        # Selected sections ki details
        selected_sections = [s for s in all_sections if s['id'] in selected_ids]
 
        # ─── Per-Section Data ─────────────────────────────────────────────
        sections_data = []
        totals = {
            'total_employees':   0,
            'total_activities':  0,
            'total_bp_tasks':    0,
            'completed_tasks':   0,
            'inprogress_tasks':  0,
            'not_started':       0,
            'risks_encountered': 0,
            'avg_completion':    0,
        }
        total_bp_for_avg = 0
        total_pct_sum    = 0
 
        for section in selected_sections:
            sec_id   = section['id']
            sec_name = section['name']
 
            # Employees in this section
            emp_erpids = list(
                Employees.objects.filter(
                    section_id=sec_id
                ).values_list('erp_id', flat=True)
            )
            emp_count = len(emp_erpids)
 
            # Activities
            acts_qs = EmployeeActivity.objects.filter(
                erpid__in=emp_erpids,
                activity_date__gte=date_from,
                activity_date__lte=date_to
            )
            act_count   = acts_qs.count()
            risk_count  = acts_qs.exclude(
                risk_comment__isnull=True
            ).exclude(risk_comment='').exclude(risk_comment='—').count()
 
            # BP Tasks
            bp_qs = BusinessPlan.objects.filter(
                department__icontains=sec_name
            )
            bp_total   = bp_qs.count()
            bp_done    = bp_qs.filter(completion_pct=100).count()
            bp_prog    = bp_qs.filter(completion_pct__gt=0, completion_pct__lt=100).count()
            bp_not_st  = bp_qs.filter(completion_pct=0).count()
 
            # Avg completion for this section
            sec_avg = 0
            if bp_total > 0:
                sec_avg = round(sum(t.completion_pct for t in bp_qs) / bp_total, 1)
                total_pct_sum    += sum(t.completion_pct for t in bp_qs)
                total_bp_for_avg += bp_total
 
            sections_data.append({
                'section_id':        sec_id,
                'section_name':      sec_name,
                'total_employees':   emp_count,
                'total_activities':  act_count,
                'total_bp_tasks':    bp_total,
                'completed_tasks':   bp_done,
                'inprogress_tasks':  bp_prog,
                'not_started':       bp_not_st,
                'risks_encountered': risk_count,
                'avg_completion':    sec_avg,
            })
 
            # Accumulate totals
            totals['total_employees']   += emp_count
            totals['total_activities']  += act_count
            totals['total_bp_tasks']    += bp_total
            totals['completed_tasks']   += bp_done
            totals['inprogress_tasks']  += bp_prog
            totals['not_started']       += bp_not_st
            totals['risks_encountered'] += risk_count
 
        # Overall avg completion
        if total_bp_for_avg > 0:
            totals['avg_completion'] = round(total_pct_sum / total_bp_for_avg, 1)
 
        # ─── 7-Day Overview (all selected sections) ───────────────────────
        all_erpids = list(
            Employees.objects.filter(
                section_id__in=selected_ids
            ).values_list('erp_id', flat=True)
        )
 
        seven_days = []
        for i in range(6, -1, -1):
            day     = date.today() - timedelta(days=i)
            day_str = str(day)
            day_qs  = EmployeeActivity.objects.filter(
                erpid__in=all_erpids,
                activity_date=day_str
            )
            day_risks = day_qs.exclude(
                risk_comment__isnull=True
            ).exclude(risk_comment='').exclude(risk_comment='—').count()
            seven_days.append({
                'date':       day_str,
                'day':        day.strftime('%a'),
                'activities': day_qs.count(),
                'risks':      day_risks,
            })
 
        # ─── Department Comparison Chart data ────────────────────────────
        dept_comparison = [
            {
                'name':           s['section_name'],
                'employees':      s['total_employees'],
                'activities':     s['total_activities'],
                'bp_completion':  s['avg_completion'],
                'completed':      s['completed_tasks'],
                'inprogress':     s['inprogress_tasks'],
                'not_started':    s['not_started'],
                'risks':          s['risks_encountered'],
            }
            for s in sections_data
        ]
 
        return JsonResponse({
            'all_sections':    all_sections,
            'selected_ids':    selected_ids,
            'sections_data':   sections_data,
            'totals':          totals,
            'seven_days':      seven_days,
            'dept_comparison': dept_comparison,
            'date_from':       date_from,
            'date_to':         date_to,
        })
 
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

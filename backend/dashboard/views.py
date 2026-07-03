from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import date, timedelta


# ─────────────────────────────────────────────────────────────
# HELPER: risk count from a queryset
# ─────────────────────────────────────────────────────────────
def _risk_count(qs):
    return qs.exclude(
        risk_comment__isnull=True
    ).exclude(risk_comment='').exclude(risk_comment='\u2014').count()


# ─────────────────────────────────────────────────────────────
# HELPER: bp stats for a queryset
# ─────────────────────────────────────────────────────────────
def _bp_stats(bp_qs):
    total     = bp_qs.count()
    completed = bp_qs.filter(completion_pct=100).count()
    inprog    = bp_qs.filter(completion_pct__gt=0, completion_pct__lt=100).count()
    not_st    = bp_qs.filter(completion_pct=0).count()
    avg       = 0.0
    if total > 0:
        avg = round(sum(t.completion_pct for t in bp_qs) / total, 1)
    return total, completed, inprog, not_st, avg


@csrf_exempt
def department_dashboard(request):
    """
    Department Dashboard API

    Picker logic (what checkboxes appear):
      superuser        → all subsections across all sections
      grade 10/11      → all subsections of their own section
      grade 9 + HEAD   → only the subsections they personally head
      grade 9, not HEAD→ only their own subsection (single badge, no picker)
      grade < 9        → 403

    Data scope = employees whose sub_section_id is in selected_sub_ids.
    BP tasks scope = section_id of the subsections\'s parent section.
    """
    grade_id          = int(request.GET.get('grade_id', 0))
    is_superuser      = request.GET.get('is_superuser', 'false') == 'true'
    erp_id            = int(request.GET.get('erp_id', 0))
    user_section_id   = request.GET.get('section_id', '0')
    user_subsection_id = request.GET.get('sub_section_id', '0')
    sub_ids_param     = request.GET.get('sub_section_ids', '')   # comma-separated
    date_from         = request.GET.get('date_from', str(date.today()))
    date_to           = request.GET.get('date_to',   str(date.today()))
    admin_grades      = [9, 10, 11]

    if not is_superuser and grade_id not in admin_grades:
        return JsonResponse({'error': 'Access denied'}, status=403)

    try:
        from users.models import Employees
        from sections.models import Sections
        from subsections.models import SubSection
        from activities.models import EmployeeActivity
        from businessplan.models import BusinessPlan

        # ── Step 1: Allowed subsections for this user ────────────────────
        if is_superuser:
            allowed_subs = list(
                SubSection.objects.select_related('section')
                .values('id', 'sub_section_name', 'section_id', 'section__name')
                .order_by('section__name', 'sub_section_name')
            )

        elif grade_id in [10, 11]:
            # All subsections of their own section
            if user_section_id and user_section_id != '0':
                allowed_subs = list(
                    SubSection.objects.filter(section_id=int(user_section_id))
                    .select_related('section')
                    .values('id', 'sub_section_name', 'section_id', 'section__name')
                    .order_by('sub_section_name')
                )
            else:
                allowed_subs = []

        elif grade_id == 9:
            # Only subsections this employee personally heads
            headed = SubSection.objects.filter(
                head_employee_id=erp_id
            ).select_related('section')

            if headed.exists():
                allowed_subs = list(
                    headed.values('id', 'sub_section_name', 'section_id', 'section__name')
                    .order_by('sub_section_name')
                )
            else:
                # Not a head — only their own subsection (if assigned)
                if user_subsection_id and user_subsection_id != '0':
                    try:
                        ss = SubSection.objects.select_related('section').get(
                            id=int(user_subsection_id)
                        )
                        allowed_subs = [{
                            'id': ss.id,
                            'sub_section_name': ss.sub_section_name,
                            'section_id': ss.section_id,
                            'section__name': ss.section.name,
                        }]
                    except SubSection.DoesNotExist:
                        allowed_subs = []
                else:
                    allowed_subs = []
        else:
            allowed_subs = []

        allowed_sub_ids = {s['id'] for s in allowed_subs}

        # ── Step 2: Parse selected sub_section_ids from request ──────────
        if sub_ids_param:
            requested = [
                int(x) for x in sub_ids_param.split(',')
                if x.strip().isdigit()
            ]
            # Security: only keep what user is allowed
            selected_sub_ids = [sid for sid in requested if sid in allowed_sub_ids]
        else:
            # Default: all allowed
            selected_sub_ids = list(allowed_sub_ids)

        if not selected_sub_ids:
            return JsonResponse({
                'allowed_subs':      allowed_subs,
                'selected_sub_ids':  [],
                'sub_section_names': [],
                'total_employees':   0,
                'total_activities':  0,
                'total_bp_tasks':    0,
                'completed_tasks':   0,
                'inprogress_tasks':  0,
                'not_started':       0,
                'risks_encountered': 0,
                'avg_completion':    0.0,
                'seven_days':        [],
                'subsection_breakdown': [],
                'date_from':         date_from,
                'date_to':           date_to,
            })

        # Names of selected subs
        selected_sub_names = [
            s['sub_section_name']
            for s in allowed_subs if s['id'] in set(selected_sub_ids)
        ]

        # ── Step 3: Employees in selected subsections ────────────────────
        emp_qs = Employees.objects.filter(sub_section_id__in=selected_sub_ids)
        section_erpids = list(emp_qs.values_list('erp_id', flat=True))
        total_employees = len(section_erpids)

        # ── Step 4: Activities ───────────────────────────────────────────
        acts_qs = EmployeeActivity.objects.filter(
            erp_id__in=section_erpids,
            activity_date__gte=date_from,
            activity_date__lte=date_to,
        )
        total_activities  = acts_qs.count()
        risks_encountered = _risk_count(acts_qs)

        # ── Step 5: BP Tasks (section-level, from parent sections) ──────
        parent_section_ids = list({
            s['section_id'] for s in allowed_subs
            if s['id'] in set(selected_sub_ids)
        })
        bp_qs = BusinessPlan.objects.filter(section_id__in=parent_section_ids)
        total_bp_tasks, completed_tasks, inprogress_tasks, not_started, avg_completion = _bp_stats(bp_qs)

        # ── Step 6: 7-Day chart ──────────────────────────────────────────
        seven_days = []
        for i in range(6, -1, -1):
            day     = date.today() - timedelta(days=i)
            day_str = str(day)
            day_qs  = EmployeeActivity.objects.filter(
                erp_id__in=section_erpids,
                activity_date=day_str,
            )
            seven_days.append({
                'date':       day_str,
                'day':        day.strftime('%a'),
                'activities': day_qs.count(),
                'risks':      _risk_count(day_qs),
            })

        # ── Step 7: Per-subsection breakdown ────────────────────────────
        subsection_breakdown = []
        for ss in allowed_subs:
            if ss['id'] not in set(selected_sub_ids):
                continue
            ss_emp_ids = list(
                Employees.objects.filter(
                    sub_section_id=ss['id']
                ).values_list('erp_id', flat=True)
            )
            ss_acts = EmployeeActivity.objects.filter(
                erp_id__in=ss_emp_ids,
                activity_date__gte=date_from,
                activity_date__lte=date_to,
            )
            subsection_breakdown.append({
                'sub_section_id':   ss['id'],
                'sub_section_name': ss['sub_section_name'],
                'section_name':     ss['section__name'],
                'total_employees':  len(ss_emp_ids),
                'total_activities': ss_acts.count(),
                'risks':            _risk_count(ss_acts),
            })

        return JsonResponse({
            'allowed_subs':         allowed_subs,
            'selected_sub_ids':     selected_sub_ids,
            'sub_section_names':    selected_sub_names,
            'total_employees':      total_employees,
            'total_activities':     total_activities,
            'total_bp_tasks':       total_bp_tasks,
            'completed_tasks':      completed_tasks,
            'inprogress_tasks':     inprogress_tasks,
            'not_started':          not_started,
            'risks_encountered':    risks_encountered,
            'avg_completion':       avg_completion,
            'seven_days':           seven_days,
            'subsection_breakdown': subsection_breakdown,
            'date_from':            date_from,
            'date_to':              date_to,
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
                erp_id__in=emp_erpids,
                activity_date__gte=date_from,
                activity_date__lte=date_to
            )
            act_count   = acts_qs.count()
            risk_count  = acts_qs.exclude(
                risk_comment__isnull=True
            ).exclude(risk_comment='').exclude(risk_comment='—').count()
 
            # BP Tasks
            bp_qs = BusinessPlan.objects.filter(section_id=sec_id)
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
                erp_id__in=all_erpids,
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
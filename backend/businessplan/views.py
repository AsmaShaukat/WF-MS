from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from .models import BusinessPlan
import json
import openpyxl


def get_user_grade(request):
    grade = request.headers.get('X-Grade-Id')
    if grade:
        return int(grade)
    return 0


def get_user_erpid(request):
    """Erp id current user ka — header (GET/DELETE) ya POST/PUT body/query se."""
    erpid = request.headers.get('X-Erp-Id')
    if erpid:
        try:
            return int(erpid)
        except (TypeError, ValueError):
            return 0
    return 0


def get_head_sub_section_ids(erp_id):
    """Grade-9 employee jin sub-sections ka head hai unki ID list (DB-verified)."""
    if not erp_id:
        return []
    from subsections.models import SubSection
    return list(SubSection.objects.filter(head_employee_id=erp_id).values_list('id', flat=True))


def get_own_sub_section_id(erp_id):
    """Employee khud kis sub-section ka member hai (employees.sub_section_id se)."""
    if not erp_id:
        return None
    from users.models import Employees
    return Employees.objects.filter(erp_id=erp_id).values_list('sub_section_id', flat=True).first()


def get_bp_scope(grade, erp_id, is_superuser, section_id=None):
    """
    Business Plan module ka access scope — DB-verified, server-side (frontend
    se aane wali koi bhi flag/role trust nahi karte):

      {'type': 'all'}                       -> superuser: sab sections, sab sub-sections
      {'type': 'section', 'section_id': X}  -> grade 10/11: apni poori section
      {'type': 'subsections', 'ids': [..]}  -> grade-9 sub-section-head: sirf apni headed sub-section(s)
      {'type': 'own', 'sub_section_id': X}  -> grade 1-9 (non-head): sirf apni khud ki sub-section
      {'type': 'none'}                      -> section/sub-section maloom nahi, kuch bhi nahi dikhega
    """
    if is_superuser:
        return {'type': 'all'}
    if grade in [10, 11]:
        if not section_id or str(section_id) == '0':
            return {'type': 'none'}
        return {'type': 'section', 'section_id': int(section_id)}
    if grade == 9:
        head_ids = get_head_sub_section_ids(erp_id)
        if head_ids:
            return {'type': 'subsections', 'ids': head_ids}
        # grade 9 lekin kisi sub-section ka head nahi — normal employee jaisa treat karo
    own_ss = get_own_sub_section_id(erp_id)
    if own_ss:
        return {'type': 'own', 'sub_section_id': own_ss}
    return {'type': 'none'}


def apply_bp_scope(qs, scope, extra_sub_section_id=None):
    """Scope dict ko queryset par apply karta hai. extra_sub_section_id
    dropdown se aayi optional narrowing filter hai (sirf allowed scope ke andar hi kaam karti hai)."""
    if scope['type'] == 'all':
        if extra_sub_section_id and str(extra_sub_section_id) != '0':
            qs = qs.filter(lead_team_id=int(extra_sub_section_id))
        return qs
    if scope['type'] == 'section':
        qs = qs.filter(section_id=scope['section_id'])
        if extra_sub_section_id and str(extra_sub_section_id) != '0':
            qs = qs.filter(lead_team_id=int(extra_sub_section_id))
        return qs
    if scope['type'] == 'subsections':
        ids = scope['ids']
        if extra_sub_section_id and int(extra_sub_section_id) in ids:
            ids = [int(extra_sub_section_id)]
        return qs.filter(lead_team_id__in=ids)
    if scope['type'] == 'own':
        return qs.filter(lead_team_id=scope['sub_section_id'])
    return qs.none()


def can_modify_row(bp, scope, erp_id):
    """Ek specific BusinessPlan row ko edit/delete karne ki ijazat hai ya nahi."""
    if scope['type'] == 'all':
        return True
    if scope['type'] == 'section':
        return bp.section_id == scope['section_id']
    if scope['type'] == 'subsections':
        return bp.lead_team_id in scope['ids']
    if scope['type'] == 'own':
        return bp.lead_team_id == scope['sub_section_id'] and bp.created_by == erp_id
    return False


def resolve_lead_team(value):
    """
    lead_team frontend se naam (e.g. 'DPC') ya id, dono tarah aa sakta hai —
    dropdown options hamesha sub_section_name se banti hain, is liye naam
    hi zyada aam hai. Pehle naam se try karo, phir id se (upload_excel
    jaisi hi logic, taake add/update/upload sab consistent rahen).
    Returns (obj_or_None, found_bool).
    """
    from subsections.models import SubSection
    if not value:
        return None, True  # empty = clear kar rahe hain, valid
    value = str(value).strip()
    try:
        return SubSection.objects.get(sub_section_name__iexact=value), True
    except SubSection.DoesNotExist:
        try:
            return SubSection.objects.get(pk=int(value)), True
        except (SubSection.DoesNotExist, ValueError):
            return None, False


def validate_date_range(start_date, end_date, parent_sr):
    """
    Sub-task ki start/end date apne parent task ke date-range ke andar
    honi chahiye — na parent se pehle shuru ho, na parent ke baad khatam ho.
    start_date/end_date string (YYYY-MM-DD) ya date object ho sakti hain.
    Returns error message (string) ya None (valid).
    """
    from django.utils.dateparse import parse_date

    def _to_date(val):
        if not val:
            return None
        if isinstance(val, str):
            return parse_date(val)
        return val  # already a date object

    start = _to_date(start_date)
    end = _to_date(end_date)

    if start and end and start > end:
        return "Start date must be earlier than the end date"

    if parent_sr:
        parent = BusinessPlan.objects.filter(sr_number=parent_sr).values('start_date', 'end_date').first()
        if parent:
            p_start, p_end = parent['start_date'], parent['end_date']
            if start and p_start and start < p_start:
                return f"Start date cannot be earlier than the parent task's start date ({p_start})"
            if end and p_end and end > p_end:
                return f"End date cannot be later than the parent task's end date ({p_end})"

    return None


@csrf_exempt
def get_my_scope(request):
    """
    Business Plan page ke liye current user ka access-scope + display info,
    ek hi call mein — section name, sub-section dropdown options (admin-tier)
    ya khud ki sub-section (regular employee), taake frontend ko alag alag
    endpoints se jodna na pade.
    """
    from sections.models import Sections
    from subsections.models import SubSection

    section_id   = request.GET.get('section_id')
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    grade        = get_user_grade(request)
    erpid        = get_user_erpid(request)

    scope = get_bp_scope(grade, erpid, is_superuser, section_id)

    section_name = None
    if section_id and str(section_id) != '0':
        section_name = Sections.objects.filter(pk=int(section_id)).values_list('name', flat=True).first()

    result = {'scope_type': scope['type'], 'section_name': section_name}

    if scope['type'] == 'all':
        ss_qs = SubSection.objects.all()
        if section_id and str(section_id) != '0':
            ss_qs = ss_qs.filter(section_id=int(section_id))
        result['sub_sections'] = list(ss_qs.values('id', 'sub_section_name'))
    elif scope['type'] == 'section':
        ss_qs = SubSection.objects.filter(section_id=scope['section_id'])
        result['sub_sections'] = list(ss_qs.values('id', 'sub_section_name'))
    elif scope['type'] == 'subsections':
        result['sub_sections'] = list(
            SubSection.objects.filter(pk__in=scope['ids']).values('id', 'sub_section_name')
        )
    elif scope['type'] == 'own':
        result['own_sub_section'] = SubSection.objects.filter(
            pk=scope['sub_section_id']
        ).values('id', 'sub_section_name').first()

    return JsonResponse(result)


@csrf_exempt
def get_all(request):
    section_id     = request.GET.get('section_id')
    sub_section_id = request.GET.get('sub_section_id')  # optional dropdown narrowing
    is_superuser   = request.GET.get('is_superuser', 'false').lower() == 'true'
    grade_id       = int(request.GET.get('grade_id', '0') or 0)
    erp_id         = get_user_erpid(request)

    scope = get_bp_scope(grade_id, erp_id, is_superuser, section_id)

    qs = BusinessPlan.objects.annotate(
        section_name=F('section__name'),
        lead_team_name=F('lead_team__sub_section_name'),
    )
    qs = apply_bp_scope(qs, scope, sub_section_id)

    plans = qs.values(
        'id', 'sr_number', 'parent_sr', 'level',
        'section_id', 'section_name',
        'task', 'start_date', 'end_date',
        'lead_team_id', 'lead_team_name',
        'support_team', 'dependencies', 'deliverables',
        'completion_pct', 'created_by', 'created_at', 'uploaded_by_grade',
    )

    return JsonResponse(list(plans), safe=False)


@csrf_exempt
def upload_excel(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)

    excel_file = request.FILES.get('file')
    if not excel_file:
        return JsonResponse({'error': 'No file uploaded'}, status=400)

    try:
        from datetime import date, datetime

        wb = openpyxl.load_workbook(excel_file)
        ws = wb.active
        created          = 0
        skipped_dup      = 0
        skipped_section  = 0
        skipped_lead     = 0   # lead_team sub_sections mein nahi mila
        skipped_lead_scope = 0 # lead_team mila, lekin uploader ki allowed subsection list mein nahi
        erpid            = int(request.POST.get('erpid', 0))
        section_id       = request.POST.get('section_id', None)
        grade            = get_user_grade(request)
        is_superuser     = request.POST.get('is_superuser', 'false').lower() == 'true'

        user_sec_id = int(section_id) if section_id else None

        # Excel upload sirf grade 10/11, grade-9 sub-section-head ya superuser
        # kar sakte hain (DB se verify — frontend flag trust nahi karte)
        scope = get_bp_scope(grade, erpid, is_superuser, user_sec_id)
        if scope['type'] not in ('all', 'section', 'subsections'):
            return JsonResponse(
                {'error': 'Permission denied — only section heads (grade 9), grade 10/11, or superusers can upload Excel files'},
                status=403
            )

        def parse_date(val):
            if not val:
                return None
            if isinstance(val, (date, datetime)):
                return val
            val = str(val).strip()
            for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y'):
                try:
                    return datetime.strptime(val, fmt).date()
                except ValueError:
                    continue
            return None

        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[0]:
                continue

            sr = str(row[0]).strip()

            # Section decide karo
            row_sec_id = int(row[1]) if row[1] else None

            if is_superuser:
                sec_id = row_sec_id or user_sec_id
            else:
                if row_sec_id and row_sec_id != user_sec_id:
                    skipped_section += 1
                    continue
                sec_id = user_sec_id

            task    = str(row[2] or '').strip()
            start   = parse_date(row[3])
            end     = parse_date(row[4])
            lead    = str(row[5] or '').strip()   # Excel mein sub_section_name ya id
            support = str(row[6] or '').strip()
            dep     = str(row[7] or '').strip()
            deliv   = str(row[8] or '').strip()
            level   = int(row[9] or 0)
            parent  = str(row[10]).strip() if len(row) > 10 and row[10] else None

            # lead_team ab MANDATORY hai — na khali reh sakta hai, na
            # unresolved. Naam se pehle, phir ID se try hota hai (resolve_lead_team);
            # dono fail hon to row REJECT hoti hai, NULL save nahi hoti.
            if not lead:
                skipped_lead += 1  # lead_team column khali tha
                continue
            lead_team_obj, found = resolve_lead_team(lead)
            if not found:
                skipped_lead += 1  # naam/ID kisi se bhi match nahi hua
                continue

            # Grade-9 sub-section-head sirf apni headed subsection(s) ke against
            # rows upload kar sakta hai — kisi doosri subsection ka lead_team ho
            # to wo row skip ho jayegi (add_row jaisi hi restriction, consistent)
            if scope['type'] == 'subsections' and lead_team_obj.id not in scope['ids']:
                skipped_lead_scope += 1
                continue

            # Duplicate check — ab GLOBAL nahi, sirf apni section + subsection
            # (lead_team) ke andar hi dhoondta hai. Isse do alag sections/
            # subsections agar milta-julta sr_number scheme use karein
            # (jaise dono "T-01"), to wo ek-doosre ko galat "duplicate"
            # samajh ke skip nahi karenge.
            dup_filter = {'sr_number': sr, 'section_id': sec_id}
            if lead_team_obj:
                dup_filter['lead_team_id'] = lead_team_obj.id
            if BusinessPlan.objects.filter(**dup_filter).exists():
                skipped_dup += 1
                continue

            BusinessPlan.objects.create(
                sr_number         = sr,
                parent_sr         = parent or None,
                level             = level,
                section_id        = sec_id,
                task              = task,
                start_date        = start,
                end_date          = end,
                lead_team         = lead_team_obj,
                support_team      = support,
                dependencies      = dep,
                deliverables      = deliv,
                completion_pct    = 0,
                created_by        = erpid,
                uploaded_by_grade = grade,
            )
            created += 1

        return JsonResponse({
            'success': True,
            'rows_created': created,
            'skipped_duplicate': skipped_dup,
            'skipped_other_section': skipped_section,
            'skipped_invalid_lead_team': skipped_lead,
            'skipped_lead_out_of_scope': skipped_lead_scope,
        })

    except Exception as e:
        import traceback
        return JsonResponse({'error': str(e), 'trace': traceback.format_exc()}, status=500)


@csrf_exempt
def add_row(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data = json.loads(request.body)
        grade = get_user_grade(request)
        erpid = get_user_erpid(request)  # header se — body ka 'created_by' trust nahi karte
        is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true' or data.get('is_superuser', False)
        user_section_id = data.get('user_section_id') or data.get('section_id')

        scope = get_bp_scope(grade, erpid, is_superuser, user_section_id)
        if scope['type'] == 'none':
            return JsonResponse({'error': 'Section/sub-section not found for this user'}, status=403)

        if is_superuser:
            section_id = data.get('section_id') or None
        else:
            section_id = int(user_section_id) if user_section_id else None

        # lead_team validate karo sub_sections se — naam (dropdown se aata hai) ya id, dono chalte hain
        # Lead Team ab MANDATORY hai — koi bhi task bina Lead Team ke save nahi ho sakta.
        lead_team_value = data.get('lead_team_id') or data.get('lead_team')
        if not lead_team_value:
            # Normal employee (scope 'own') ke liye apni sub-section automatically
            # use ho jati hai — unhe manually select karne ki zaroorat nahi
            if scope['type'] == 'own':
                lead_team_value = scope['sub_section_id']
            else:
                return JsonResponse({'error': 'Lead Team is required — a task cannot be saved without it'}, status=400)

        lead_team_obj, found = resolve_lead_team(lead_team_value)
        if not found:
            return JsonResponse(
                {'error': f'Lead Team "{lead_team_value}" was not found in the sub-sections table'},
                status=400
            )

        # Normal employee (scope 'own') sirf apni khud ki sub-section ko lead_team assign kar sakta hai
        if scope['type'] == 'own' and lead_team_obj.id != scope['sub_section_id']:
            return JsonResponse(
                {'error': 'You can only add tasks against your own sub-section'},
                status=403
            )
        elif scope['type'] == 'subsections' and lead_team_obj.id not in scope['ids']:
            return JsonResponse(
                {'error': 'You can only add tasks against the sub-section(s) you head'},
                status=403
            )

        # Sub-task ki dates apne parent task ke date-range ke andar honi chahiye
        date_error = validate_date_range(
            data.get('start_date'), data.get('end_date'), data.get('parent_sr')
        )
        if date_error:
            return JsonResponse({'error': date_error}, status=400)

        BusinessPlan.objects.create(
            sr_number         = data.get('sr_number'),
            parent_sr         = data.get('parent_sr') or None,
            level             = data.get('level', 0),
            section_id        = section_id,
            task              = data.get('task', ''),
            start_date        = data.get('start_date') or None,
            end_date          = data.get('end_date') or None,
            lead_team         = lead_team_obj,
            support_team      = data.get('support_team', ''),
            dependencies      = data.get('dependencies', ''),
            deliverables      = data.get('deliverables', ''),
            completion_pct    = 0,
            created_by        = erpid,
            uploaded_by_grade = grade,
        )
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_row(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT only'}, status=405)
    try:
        data         = json.loads(request.body)
        grade        = get_user_grade(request)
        erpid        = get_user_erpid(request)
        is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
        user_sec_id  = request.GET.get('section_id')

        bp = BusinessPlan.objects.get(pk=pk)

        scope = get_bp_scope(grade, erpid, is_superuser, user_sec_id)
        if not can_modify_row(bp, scope, erpid):
            return JsonResponse({'error': 'Permission denied — this task is outside your access scope'}, status=403)

        bp.task           = data.get('task', bp.task)
        bp.start_date     = data.get('start_date') or bp.start_date
        bp.end_date       = data.get('end_date') or bp.end_date
        bp.support_team   = data.get('support_team', bp.support_team)
        bp.dependencies   = data.get('dependencies', bp.dependencies)
        bp.deliverables   = data.get('deliverables', bp.deliverables)
        bp.completion_pct = data.get('completion_pct', bp.completion_pct)

        # lead_team update — sub_sections se validate (naam ya id, dono chalte hain)
        # Lead Team mandatory hai — ise khali/clear nahi kiya ja sakta.
        if 'lead_team_id' in data or 'lead_team' in data:
            lead_team_value = data.get('lead_team_id') or data.get('lead_team')
            if not lead_team_value:
                return JsonResponse({'error': 'Lead Team is required — this field cannot be left empty'}, status=400)
            lead_team_obj, found = resolve_lead_team(lead_team_value)
            if not found:
                return JsonResponse(
                    {'error': f'Lead Team "{lead_team_value}" was not found in the sub-sections table'},
                    status=400
                )
            bp.lead_team = lead_team_obj

        if 'section_id' in data:
            bp.section_id = data.get('section_id') or None

        # Sub-task ki dates apne parent task ke date-range ke andar honi chahiye
        date_error = validate_date_range(bp.start_date, bp.end_date, bp.parent_sr)
        if date_error:
            return JsonResponse({'error': date_error}, status=400)

        bp.save()

        # 🔧 FIX: agar completion_pct manually change hua (defensive — UI
        # ab field read-only rakhti hai, lekin API safety ke liye), to
        # parent chain ko bhi resync karo
        from .models import sync_parent_completion
        sync_parent_completion(bp)

        return JsonResponse({'success': True})
    except BusinessPlan.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def get_all_descendant_ids(task_sr):
    """
    Ek task ke sr_number se uske tamam children aur grandchildren (cascade) ke IDs return karta hai.
    """
    all_ids = []
    queue = [task_sr]
    while queue:
        current_sr = queue.pop(0)
        children = BusinessPlan.objects.filter(parent_sr=current_sr)
        for child in children:
            all_ids.append(child.id)
            queue.append(child.sr_number)
    return all_ids


def resequence_siblings(parent_sr):
    """
    Ek parent ke tamam child tasks ka sr_number 01, 02, 03... ke hisaab se update karta hai.
    Agar parent_sr None hai to top-level tasks resequence hoti hain.
    """
    siblings = BusinessPlan.objects.filter(parent_sr=parent_sr).order_by('sr_number')
    for idx, sibling in enumerate(siblings, start=1):
        if parent_sr:
            new_sr = f"{parent_sr}-{str(idx).zfill(2)}"
        else:
            # Top-level: prefix ko preserve karo, sirf number update karo
            parts = sibling.sr_number.rsplit('-', 1)
            if len(parts) == 2:
                prefix = parts[0]
                new_sr = f"{prefix}-{str(idx).zfill(2)}"
            else:
                new_sr = sibling.sr_number  # format samajh nahi aaya, chod do

        if sibling.sr_number != new_sr:
            old_sr = sibling.sr_number
            sibling.sr_number = new_sr
            sibling.save(update_fields=['sr_number'])
            # Is sibling ke children ka parent_sr bhi update karo
            BusinessPlan.objects.filter(parent_sr=old_sr).update(parent_sr=new_sr)
            # Recursively us sibling ke children ko bhi resequence karo
            resequence_siblings(new_sr)


@csrf_exempt
def delete_row(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        from activities.models import EmployeeActivity

        is_superuser     = request.GET.get('is_superuser', 'false').lower() == 'true'
        user_section_id  = request.GET.get('section_id')
        grade            = get_user_grade(request)
        erpid            = get_user_erpid(request)

        bp = BusinessPlan.objects.get(pk=pk)

        scope = get_bp_scope(grade, erpid, is_superuser, user_section_id)
        if not can_modify_row(bp, scope, erpid):
            return JsonResponse(
                {'error': 'Permission denied — this task is outside your access scope'},
                status=403
            )

        # Is task ke tamam children aur grandchildren ke IDs nikalo
        descendant_ids = get_all_descendant_ids(bp.sr_number)
        all_task_ids = [pk] + descendant_ids

        # Check: kisi bhi task (parent ya child) ke against activity exist karti hai?
        if EmployeeActivity.objects.filter(bp_task_id__in=all_task_ids).exists():
            return JsonResponse(
                {
                    'error': (
                        'Cannot delete — this task or its child tasks already '
                        'have employee activities logged against them'
                    )
                },
                status=400
            )

        parent_sr = bp.parent_sr

        # Pehle tamam children delete karo (cascade), phir parent
        BusinessPlan.objects.filter(id__in=descendant_ids).delete()
        bp.delete()

        # NOTE: Pehle yahan resequence_siblings(parent_sr) call hota tha jo
        # baqi siblings ka sr_number 01,02,03... resequence kar deta tha.
        # Isay jaan-boojh kar hata diya gaya hai — sr_number ko STABLE/
        # PERMANENT rakhna zaroori hai, warna Excel re-upload par duplicate-
        # detection ghalat result deta hai (delete ho chuka task "duplicate"
        # samajh ke skip ho jata, aur kisi doosre task ka number badal ke
        # naya duplicate ban jata). Delete hone ke baad number gap chhod
        # diya jata hai — jaise invoice/ticket numbering mein hota hai.

        # Parent chain ka completion % resync karo
        from .models import recalc_chain_from_parent_sr
        recalc_chain_from_parent_sr(parent_sr)

        return JsonResponse({'success': True})
    except BusinessPlan.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        import traceback
        return JsonResponse({'error': str(e), 'trace': traceback.format_exc()}, status=500)


# ─────────────────────────────────────────────────────────────
# GET /businessplan/main-task-report/
#
# Comprehensive report: for every Level-0 (main) task —
#   - kitne sub-tasks (level 1, level 2 ... sab descendants) hain
#   - har sub-task ke against har employee ne kitna % kaam kiya
#     (EmployeeActivity se, latest record per employee per task)
#   - har sub-task ka apna completion_pct (BusinessPlan se)
#   - main task ka overall completion_pct (already-maintained rollup)
#
# Access rules same as get_all(): superuser sees everything,
# others restricted to their own section.
# ─────────────────────────────────────────────────────────────
@csrf_exempt
def get_main_task_report(request):
    from activities.models import EmployeeActivity

    section_id   = request.GET.get('section_id')
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    grade        = get_user_grade(request)
    erpid        = get_user_erpid(request)

    # Main Task Report sirf section-head (grade 9), grade 10/11 ya
    # superuser dekh sakte hain — normal employee ke liye nahi
    scope = get_bp_scope(grade, erpid, is_superuser, section_id)
    if scope['type'] not in ('all', 'section', 'subsections'):
        return JsonResponse({'error': 'Permission denied'}, status=403)

    qs = BusinessPlan.objects.annotate(
        section_name=F('section__name'),
        lead_team_name=F('lead_team__sub_section_name'),
    )
    qs = apply_bp_scope(qs, scope)

    all_tasks = list(qs.values(
        'id', 'sr_number', 'parent_sr', 'level',
        'section_id', 'section_name', 'task',
        'start_date', 'end_date', 'lead_team_name',
        'completion_pct',
    ))

    # Index by sr_number for quick child lookup
    by_parent = {}
    for t in all_tasks:
        by_parent.setdefault(t['parent_sr'], []).append(t)

    def get_descendants(sr_number):
        """All children, grandchildren, etc. of a task (flat list)."""
        result = []
        queue = [sr_number]
        while queue:
            current = queue.pop(0)
            children = by_parent.get(current, [])
            for child in children:
                result.append(child)
                queue.append(child['sr_number'])
        return result

    # Pull all activities once, build erp_id -> name map
    all_task_ids = [t['id'] for t in all_tasks]
    activities = list(
        EmployeeActivity.objects
        .filter(bp_task_id__in=all_task_ids)
        .order_by('bp_task_id', 'erp_id', '-activity_date', '-created_at')
        .values('bp_task_id', 'erp_id', 'overall_pct', 'status', 'activity_date')
    )

    erp_ids = list({a['erp_id'] for a in activities})
    try:
        from users.models import Employees
        emp_map = {
            e['erp_id']: e['name']
            for e in Employees.objects.filter(erp_id__in=erp_ids).values('erp_id', 'name')
        }
    except Exception:
        emp_map = {}

    # Keep only the LATEST activity per (bp_task, erp_id) — list is already
    # ordered so first occurrence per pair is the latest one
    latest_seen = set()
    activities_by_task = {}
    for a in activities:
        key = (a['bp_task_id'], a['erp_id'])
        if key in latest_seen:
            continue
        latest_seen.add(key)
        activities_by_task.setdefault(a['bp_task_id'], []).append({
            'erp_id': a['erp_id'],
            'employee_name': emp_map.get(a['erp_id'], str(a['erp_id'])),
            'overall_pct': a['overall_pct'],
            'status': a['status'],
            'activity_date': a['activity_date'],
        })

    # Build report: only Level-0 (main) tasks as top-level report entries
    report = []
    main_tasks = [t for t in all_tasks if t['level'] == 0]

    for main in main_tasks:
        descendants = get_descendants(main['sr_number'])
        sub_tasks = []
        for d in descendants:
            sub_tasks.append({
                'id': d['id'],
                'sr_number': d['sr_number'],
                'level': d['level'],
                'task': d['task'],
                'lead_team_name': d['lead_team_name'],
                'start_date': d['start_date'],
                'end_date': d['end_date'],
                'completion_pct': d['completion_pct'],
                'employees': activities_by_task.get(d['id'], []),
            })

        report.append({
            'id': main['id'],
            'sr_number': main['sr_number'],
            'task': main['task'],
            'section_name': main['section_name'],
            'lead_team_name': main['lead_team_name'],
            'start_date': main['start_date'],
            'end_date': main['end_date'],
            'overall_completion_pct': main['completion_pct'],
            'total_sub_tasks': len(sub_tasks),
            'sub_tasks': sub_tasks,
            # Direct activities logged on the main task itself (if any)
            'employees': activities_by_task.get(main['id'], []),
        })

    return JsonResponse(report, safe=False)


@csrf_exempt
def delete_all(request):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        from activities.models import EmployeeActivity

        grade        = get_user_grade(request)
        erpid        = get_user_erpid(request)
        is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
        section_id   = request.GET.get('section_id')

        scope = get_bp_scope(grade, erpid, is_superuser, section_id)
        if scope['type'] not in ('all', 'section', 'subsections'):
            return JsonResponse({'error': 'Permission denied'}, status=403)

        target_qs = apply_bp_scope(BusinessPlan.objects.all(), scope)
        target_ids = list(target_qs.values_list('id', flat=True))

        if EmployeeActivity.objects.filter(bp_task_id__in=target_ids).exists():
            return JsonResponse(
                {'error': 'Cannot delete — some tasks already have employee activities logged against them. Please delete those activities first.'},
                status=400
            )

        BusinessPlan.objects.filter(id__in=target_ids).delete()
        return JsonResponse({'success': True, 'deleted_count': len(target_ids)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
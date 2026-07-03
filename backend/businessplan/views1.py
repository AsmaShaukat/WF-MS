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


@csrf_exempt
def get_all(request):
    section_id   = request.GET.get('section_id')
    is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
    grade_id     = request.GET.get('grade_id', '0')

    qs = BusinessPlan.objects.annotate(
        section_name=F('section__name'),
        lead_team_name=F('lead_team__sub_section_name'),
    )

    if is_superuser:
        plans = qs.values(
            'id', 'sr_number', 'parent_sr', 'level',
            'section_id', 'section_name',
            'task', 'start_date', 'end_date',
            'lead_team_id', 'lead_team_name',
            'support_team', 'dependencies', 'deliverables',
            'completion_pct', 'created_by', 'created_at', 'uploaded_by_grade',
        )
    elif section_id and section_id != '0':
        plans = qs.filter(section_id=int(section_id)).values(
            'id', 'sr_number', 'parent_sr', 'level',
            'section_id', 'section_name',
            'task', 'start_date', 'end_date',
            'lead_team_id', 'lead_team_name',
            'support_team', 'dependencies', 'deliverables',
            'completion_pct', 'created_by', 'created_at', 'uploaded_by_grade',
        )
    else:
        plans = qs.none().values()

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
        from subsections.models import SubSection

        wb = openpyxl.load_workbook(excel_file)
        ws = wb.active
        created          = 0
        skipped_dup      = 0
        skipped_section  = 0
        skipped_lead     = 0   # lead_team sub_sections mein nahi mila
        erpid            = int(request.POST.get('erpid', 0))
        section_id       = request.POST.get('section_id', None)
        grade            = get_user_grade(request)
        is_superuser     = request.POST.get('is_superuser', 'false').lower() == 'true'
        is_admin_grade   = grade in [9, 10, 11]

        user_sec_id = int(section_id) if section_id else None
        if not (is_superuser or is_admin_grade) and not user_sec_id:
            return JsonResponse({'error': 'Section not found for this user'}, status=403)

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

            # Duplicate check
            if BusinessPlan.objects.filter(sr_number=sr).exists():
                skipped_dup += 1
                continue

            task    = str(row[2] or '').strip()
            start   = parse_date(row[3])
            end     = parse_date(row[4])
            lead    = str(row[5] or '').strip()   # Excel mein sub_section_name ya id
            support = str(row[6] or '').strip()
            dep     = str(row[7] or '').strip()
            deliv   = str(row[8] or '').strip()
            level   = int(row[9] or 0)
            parent  = str(row[10]).strip() if len(row) > 10 and row[10] else None

            # lead_team ko sub_sections table se validate karo (optional)
            lead_team_obj = None
            if lead:
                # Pehle name se try karo, phir id se
                try:
                    lead_team_obj = SubSection.objects.get(sub_section_name__iexact=lead)
                except SubSection.DoesNotExist:
                    try:
                        lead_team_obj = SubSection.objects.get(pk=int(lead))
                    except (SubSection.DoesNotExist, ValueError):
                        skipped_lead += 1
                        lead_team_obj = None  # match nahi mila — row phir bhi save hogi

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
        })

    except Exception as e:
        import traceback
        return JsonResponse({'error': str(e), 'trace': traceback.format_exc()}, status=500)


@csrf_exempt
def add_row(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        from subsections.models import SubSection

        data = json.loads(request.body)
        grade = get_user_grade(request)
        is_superuser = data.get('is_superuser', False)
        user_section_id = data.get('user_section_id')

        if is_superuser:
            section_id = data.get('section_id') or None
        else:
            if not user_section_id:
                return JsonResponse({'error': 'Section not found for this user'}, status=403)
            section_id = int(user_section_id)

        # lead_team_id validate karo sub_sections se
        lead_team_id = data.get('lead_team_id') or data.get('lead_team')
        lead_team_obj = None
        if lead_team_id:
            try:
                lead_team_obj = SubSection.objects.get(pk=int(lead_team_id))
            except (SubSection.DoesNotExist, ValueError):
                return JsonResponse(
                    {'error': f'lead_team id {lead_team_id} sub_sections table mein nahi mila'},
                    status=400
                )

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
            created_by        = data.get('created_by', 0),
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
        from subsections.models import SubSection

        data = json.loads(request.body)
        bp = BusinessPlan.objects.get(pk=pk)
        bp.task           = data.get('task', bp.task)
        bp.start_date     = data.get('start_date') or bp.start_date
        bp.end_date       = data.get('end_date') or bp.end_date
        bp.support_team   = data.get('support_team', bp.support_team)
        bp.dependencies   = data.get('dependencies', bp.dependencies)
        bp.deliverables   = data.get('deliverables', bp.deliverables)
        bp.completion_pct = data.get('completion_pct', bp.completion_pct)

        # lead_team update — sub_sections se validate
        if 'lead_team_id' in data or 'lead_team' in data:
            lead_team_id = data.get('lead_team_id') or data.get('lead_team')
            if lead_team_id:
                try:
                    bp.lead_team = SubSection.objects.get(pk=int(lead_team_id))
                except (SubSection.DoesNotExist, ValueError):
                    return JsonResponse(
                        {'error': f'lead_team id {lead_team_id} sub_sections table mein nahi mila'},
                        status=400
                    )
            else:
                bp.lead_team = None

        if 'section_id' in data:
            bp.section_id = data.get('section_id') or None

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

        is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
        user_section_id = request.GET.get('section_id')

        bp = BusinessPlan.objects.get(pk=pk)

        if not is_superuser:
            if not user_section_id or bp.section_id != int(user_section_id):
                return JsonResponse(
                    {'error': 'Permission denied — doosri section delete nahi kar sakte'},
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
                        'Delete nahi ho sakta — is task ya uske child tasks ke '
                        'against employee activities exist karti hain'
                    )
                },
                status=400
            )

        parent_sr = bp.parent_sr

        # Pehle tamam children delete karo (cascade), phir parent
        BusinessPlan.objects.filter(id__in=descendant_ids).delete()
        bp.delete()

        # Siblings ka sr_number resequence karo
        resequence_siblings(parent_sr)

        # Parent chain ka completion % resync karo
        from .models import recalc_chain_from_parent_sr
        recalc_chain_from_parent_sr(parent_sr)

        return JsonResponse({'success': True})
    except BusinessPlan.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)
    except Exception as e:
        import traceback
        return JsonResponse({'error': str(e), 'trace': traceback.format_exc()}, status=500)


@csrf_exempt
def delete_all(request):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        from activities.models import EmployeeActivity

        grade = get_user_grade(request)
        is_superuser = request.GET.get('is_superuser', 'false').lower() == 'true'
        if grade not in [9, 10, 11] and not is_superuser:
            return JsonResponse({'error': 'Permission denied'}, status=403)

        if EmployeeActivity.objects.filter(bp_task_id__isnull=False).exists():
            return JsonResponse(
                {'error': 'Delete nahi ho sakta — kuch tasks ke against employee activities exist karti hain. Pehle activities delete karen.'},
                status=400
            )

        BusinessPlan.objects.all().delete()
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import SubSection
import json


# ─── List all Sub Sections ────────────────────────────────────────────────────
@csrf_exempt
def get_sub_sections(request):
    section_id   = request.GET.get('section_id', '')
    is_superuser = request.GET.get('is_superuser', 'false') == 'true'

    qs = SubSection.objects.all()

    if not is_superuser and section_id:
        qs = qs.filter(section_id=int(section_id))

    data = qs.values(
        'id',
        'sub_section_name',
        'section_id',
        'section__name',
        'head_employee_id',
        'head_employee__name',
        'created_at',
    )
    return JsonResponse(list(data), safe=False)


# ─── Get single Sub Section ───────────────────────────────────────────────────
@csrf_exempt
def get_sub_section_detail(request, pk):
    try:
        obj = SubSection.objects.values(
            'id',
            'sub_section_name',
            'section_id',
            'section__name',
            'head_employee_id',
            'head_employee__name',
            'created_at',
        ).get(pk=pk)
        return JsonResponse(obj)
    except SubSection.DoesNotExist:
        return JsonResponse({'error': 'Sub section not found'}, status=404)


# ─── Create Sub Section ───────────────────────────────────────────────────────
@csrf_exempt
def create_sub_section(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data             = json.loads(request.body)
        sub_section_name = data.get('sub_section_name', '').strip()
        section_id       = data.get('section_id')
        head_employee_id = data.get('head_employee_id')

        if not sub_section_name:
            return JsonResponse({'error': 'sub_section_name is required'}, status=400)
        if not section_id:
            return JsonResponse({'error': 'section_id is required'}, status=400)
        if not head_employee_id:
            return JsonResponse({'error': 'head_employee_id is required'}, status=400)

        obj = SubSection.objects.create(
            sub_section_name=sub_section_name,
            section_id=int(section_id),
            head_employee_id=int(head_employee_id),
        )
        return JsonResponse({'success': True, 'id': obj.id, 'sub_section_name': obj.sub_section_name})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─── Update Sub Section ───────────────────────────────────────────────────────
@csrf_exempt
def update_sub_section(request, pk):
    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT only'}, status=405)
    try:
        data = json.loads(request.body)
        obj  = SubSection.objects.get(pk=pk)

        obj.sub_section_name = data.get('sub_section_name', obj.sub_section_name).strip()

        if 'section_id' in data:
            obj.section_id = int(data['section_id'])
        if 'head_employee_id' in data:
            obj.head_employee_id = int(data['head_employee_id'])

        obj.save()
        return JsonResponse({'success': True, 'id': obj.id, 'sub_section_name': obj.sub_section_name})
    except SubSection.DoesNotExist:
        return JsonResponse({'error': 'Sub section not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ─── Delete Sub Section ───────────────────────────────────────────────────────
@csrf_exempt
def delete_sub_section(request, pk):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'DELETE only'}, status=405)
    try:
        obj = SubSection.objects.get(pk=pk)
        obj.delete()
        return JsonResponse({'success': True})
    except SubSection.DoesNotExist:
        return JsonResponse({'error': 'Sub section not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

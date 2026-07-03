from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from .models import Holiday
import json
# Create your views here.


@require_GET
def get_holidays(request):
    """
    View to fetch all public holidays.
    """
    holidays = Holiday.objects.all().values('id', 'name', 'date', 'description')
    return JsonResponse(list(holidays), safe=False)

@csrf_exempt
@require_POST
def add_holiday(request):
    """
    View to add a new public holiday.
    """
    data = json.loads(request.body)
    holiday = Holiday.objects.create(
        name=data.get('name'),
        date=data.get('date'),
        description=data.get('description')
    )
    return JsonResponse({'id': holiday.id}, status=201)

@csrf_exempt
@require_POST
def delete_holiday(request, holiday_id):
    """
    View to delete a public holiday by ID.
    """
    try:
        holiday = Holiday.objects.get(id=holiday_id)
        holiday.delete()
        return JsonResponse({'message': 'Holiday deleted successfully'}, status=204)
    except Holiday.DoesNotExist:
        return JsonResponse({'error': 'Holiday not found'}, status=404)
@require_GET
def get_holiday(request, holiday_id):
    """
    View to fetch a specific public holiday by ID.
    """
    try:
        holiday = Holiday.objects.get(id=holiday_id)
        return JsonResponse({
            'id': holiday.id,
            'name': holiday.name,
            'date': holiday.date,
            'description': holiday.description
        })
    except Holiday.DoesNotExist:
        return JsonResponse({'error': 'Holiday not found'}, status=404)
    
@csrf_exempt
@require_POST
def update_holiday(request, holiday_id):
    """
    View to update a public holiday by ID.
    """
    try:
        holiday = Holiday.objects.get(id=holiday_id)
        data = json.loads(request.body)
        holiday.name = data.get('name', holiday.name)
        holiday.date = data.get('date', holiday.date)
        holiday.description = data.get('description', holiday.description)
        holiday.save()
        return JsonResponse({
            'id': holiday.id,
            'name': holiday.name,
            'date': holiday.date,
            'description': holiday.description
        })
    except Holiday.DoesNotExist:
        return JsonResponse({'error': 'Holiday not found'}, status=404)
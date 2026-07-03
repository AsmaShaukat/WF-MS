from django.shortcuts import render
from .models import MainMenu
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST,require_GET
import json
# Create your views here.
class MainMenuView:
    def get(request):
        main_menus = MainMenu.objects.all()
        data = {
            'main_menus': list(main_menus.values('id', 'name', 'description', 'created_at', 'updated_at'))
        }
        return JsonResponse(data,safe=False)
    
    @csrf_exempt
    @require_POST
    def create(request):
        
        data=json.loads(request.body.decode('utf-8'))
        name = data.get('title')
        description = data.get('description')
        main_menu = MainMenu.objects.create(
            name=name, description=description)
        return JsonResponse({'message': 'Main menu created successfully', 'id': main_menu.pk}, status=201)
    
    @csrf_exempt
    @require_POST
    def delete(request,id):

        try:
            main_menu = MainMenu.objects.get(id=int(id))
            main_menu.delete()
            return JsonResponse({'message': 'Main menu deleted successfully'}, status=200)
        except MainMenu.DoesNotExist:
            return JsonResponse({'error': 'Main menu not found'}, status=404)
        
    @require_GET
    def get_record(request,id):
        print(id)
        try:
            main_menu = MainMenu.objects.get(id=int(id))
            data = {
                'id': main_menu.pk,
                'title': main_menu.name,
                'description': main_menu.description
            }
            return JsonResponse(data, status=200)
        except MainMenu.DoesNotExist:
            return JsonResponse({'error': 'Main menu not found'}, status=404)
    @csrf_exempt
    @require_POST
    def update(request, id):
        try:
            main_menu = MainMenu.objects.get(id=int(id))
            data = json.loads(request.body.decode('utf-8'))
            main_menu.name = data.get('title', main_menu.name)
            main_menu.description = data.get('description', main_menu.description)
            main_menu.save()
            return JsonResponse({'message': 'Main menu updated successfully'}, status=200)
        except MainMenu.DoesNotExist:
            return JsonResponse({'error': 'Main menu not found'}, status=404)

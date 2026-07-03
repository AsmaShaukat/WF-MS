from django.shortcuts import render
from .models import SubMenuModel
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
import json
from sqlalchemy import create_engine, text
from db import SessionLocal
# Create your views here.
class SubMenuView:
    def get(request):
        session= SessionLocal()
        query=text("""
        SELECT s.id,m.name, s.sub_menu,s.uri
        FROM sub_menu s JOIN main_menu m ON s.main_menu = m.id""")
        try:
            result=session.execute(query).fetchall()
            data=[{"id":row.id,"mainmenu":row.name, "submenu":row.sub_menu,"uri":row.uri} for row in result]
            session.close()
            return JsonResponse(data, safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        
    @csrf_exempt
    @require_GET
    def get_by_main_menu(request, id):
        session= SessionLocal()
        query=text("""
        SELECT s.id,m.name, s.sub_menu,s.uri
        FROM sub_menu s JOIN main_menu m ON s.main_menu = m.id WHERE s.main_menu = :id
        """)
        try:
            result=session.execute(query, {"id": id}).fetchall()
            data=[{"id":row.id,"mainmenu":row.name, "submenu":row.sub_menu,"uri":row.uri} for row in result]
            session.close()
            return JsonResponse(data, safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    @csrf_exempt
    @require_POST
    def create(request):
        try:
           data=json.loads(request.body.decode('utf-8'))
           submenu=SubMenuModel.objects.create(
               main_menu=data.get('menuid'),
               sub_menu=data.get('submenu'),
               uri=data.get('uri')
           )
           return JsonResponse({"message": "Submenu created successfully"}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        
    @csrf_exempt
    @require_POST
    def delete(request,id):
        record=SubMenuModel.objects.filter(id=id).first()
        if not record:
            return JsonResponse({"error": "Record not found"}, status=404)
        try:
            record.delete()
            return JsonResponse({"message": "Record deleted successfully"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
        
    @csrf_exempt
    @require_GET
    def get_record(request, id):
        record=SubMenuModel.objects.filter(id=id).first()
        if not record:
            return JsonResponse({"error": "Record not found"}, status=404)
        return JsonResponse({"id": record.pk, "menuid": record.main_menu, "sub_menu": record.sub_menu,"uri": record.uri}, status=200)

    @csrf_exempt
    @require_POST
    def update(request,id):
        record=SubMenuModel.objects.filter(id=id).first()
        if not record:
            return JsonResponse({"error": "Record not found"}, status=404)
        try:
            data=json.loads(request.body.decode('utf-8'))
            record.main_menu=data.get('menuid')
            record.sub_menu=data.get('submenu')
            record.uri=data.get('uri')
            record.save()
            return JsonResponse({"message": "Record updated successfully"}, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
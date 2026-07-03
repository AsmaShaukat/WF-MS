from django.shortcuts import render
from .models import AssignRightsModel
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
import json
from sqlalchemy import text
from db import SessionLocal
from datetime import datetime
# Create your views here.
class AssignRightsView:
   
    def get(request,id):
        try:
            session=SessionLocal()
            query = text("""
select a.id, m.name as mainmenu, s.sub_menu as submenu, u.username, u.email,s.uri
from assign_rights a
inner join main_menu m on a.main_menu = m.id
inner join sub_menu s on a.sub_menu = s.id
inner join auth_user u on a.user_id = u.id
where a.user_id = :id
            """)
           
            data = session.execute(query,{'id':id}).fetchall()
            records=[{
                "id": row.id,
                "mainmenu": row.mainmenu,
                "submenu": row.submenu,
                "username": row.username,
                "email": row.email,
                "uri": row.uri
            } for row in data]
            session.close()
            return JsonResponse(records, safe=False, status=200)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    @csrf_exempt
    @require_POST
    def create(request):
        try:
            data = json.loads(request.body.decode('utf-8'))
            print(data)
            for submenuin in data.get('submenuid', []):
                assign_rights = AssignRightsModel.objects.create(
                    user_id=data.get('userid'),
                    main_menu=data.get('menuid'),
                    sub_menu=submenuin,
                )
            return JsonResponse({"message": "Assign rights created successfully"}, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
    
    @csrf_exempt
    @require_POST
    def delete(request, id):
        try:
            assign_rights = AssignRightsModel.objects.get(id=id)
            assign_rights.delete()
            return JsonResponse({"message": "Assign rights deleted successfully"}, status=200)
        except AssignRightsModel.DoesNotExist:
            return JsonResponse({"error": "Assign rights not found"}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
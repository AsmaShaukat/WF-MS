from django.shortcuts import render
from django.http import JsonResponse
from .models import Users, Employees  # Assuming you have a Users model defined
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
import json
import os
import datetime
from django.utils.dateparse import parse_date
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.contrib.auth import authenticate
from django.conf import settings
import jwt
from addtouser.models import CustomUser
# Assuming you have an AssignRights model defined
from assignrights.models import AssignRightsModel
from datetime import date
# Import CustomUser from another app named 'addtousers'
from addtouser.models import CustomUser
# Import LeaveModel from another app named 'attendance'
from attendance.models import Attendance
from sections.models import Sections
from sqlalchemy import text
from db import SessionLocal
import random
import requests
# Create your views here.


class UsersView:
    @require_GET
    def get(request):
        records = Users.objects.all()
        records_list = records.values(
            'uid', 'user_id', 'name', 'privilege', 'password', 'group_id', 'card'
        )
        users_list = list(records_list)
        return JsonResponse(users_list, safe=False)  # Return as JSON response

    @csrf_exempt
    @require_POST
    def create_user(request):
        data = json.loads(request.body.decode('utf-8'))

        username = data.get('username', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        erpid = data.get('erpid', '')
        email = data.get('email', '')
        password = data.get('password', '')
        verify_password = data.get('verify_password', '')
        is_staff = str(data.get('is_staff', 'false')).lower() == 'true'
        is_active = str(data.get('is_active', 'true')).lower() == 'true'
        is_superuser = str(data.get('is_superuser', 'false')).lower() == 'true'
        date_joined_str = data.get('date_joined', '')
        date_joined = parse_date(
            date_joined_str) if date_joined_str else datetime.date.today()

        if password != verify_password:
            return JsonResponse({'success': False, 'error': 'Passwords do not match'}, status=400)

        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)

        user = User.objects.create(
            password=make_password(password),
            last_login=None,
            is_superuser=is_superuser,
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_staff=is_staff,
            is_active=is_active,
            date_joined=date_joined
        )
        profile_tbl = CustomUser.objects.create(
            authid=user.pk,
            erpid=erpid)
        if profile_tbl is not None:
            return JsonResponse({'success': True, 'user_id': user.pk, 'profile_id': profile_tbl.pk})
        else:
            user.delete()
            return JsonResponse({'success': False, 'error': 'Failed to create user profile'}, status=500)

    @csrf_exempt
    @require_POST
    def signup_user(request):
        data = json.loads(request.body.decode('utf-8'))

        username = data.get('username', '')
        first_name = data.get('first_name', '')
        last_name = data.get('last_name', '')
        erpid = data.get('erpid', '')
        email = data.get('email', '')
        password = data.get('password', '')
        verify_password = data.get('verify_password', '')
        is_superuser = str(data.get('is_superuser', 'false')).lower() == 'true'
        date_joined_str = data.get('date_joined', '')
        date_joined = parse_date(
            date_joined_str) if date_joined_str else datetime.date.today()

        if password != verify_password:
            return JsonResponse({'success': False, 'error': 'Passwords do not match'}, status=400)

        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required'}, status=400)

        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)

        if CustomUser.objects.filter(erpid=erpid).exists():
            return JsonResponse({'success': False, 'error': 'ERP ID already exists'}, status=400)        

        user = User.objects.create(
            password=make_password(password),
            last_login=None,
            is_superuser=is_superuser,
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
            is_staff=1,
            is_active=1,
            date_joined=date_joined
        )

        profile_tbl = CustomUser.objects.create(
            authid=user.pk,
            erpid=erpid)

        AssignRightsModel.objects.create(
            user_id=user.pk,
            main_menu=5,  # Assuming 5 is the main menu ID for 'Users'
            sub_menu=3   # Assuming 3 is the sub menu ID for 'Create User'
        )
        # AssignRightsModel.objects.create(
        #     user_id=user.pk,
        #     main_menu=8,  # Assuming 5 is the main menu ID for 'Users'
        #     sub_menu=18   # Assuming 3 is the sub menu ID for 'Create User'
        # )
        AssignRightsModel.objects.create(
            user_id=user.pk,
            main_menu=9,  # Assuming 5 is the main menu ID for 'Users'
            sub_menu=12   # Assuming 3 is the sub menu ID for 'Create User'
        )
        AssignRightsModel.objects.create(
            user_id=user.pk,
            main_menu=9,  # Assuming 5 is the main menu ID for 'Users'
            sub_menu=16   # Assuming 3 is the sub menu ID for 'Create User'
        )

        if profile_tbl is not None:
            return JsonResponse({'success': True, 'user_id': user.pk, 'profile_id': profile_tbl.pk})
        else:
            user.delete()
            return JsonResponse({'success': False, 'error': 'Failed to create user profile'}, status=500)

    @csrf_exempt
    @require_POST
    def login_user(request):
        data = json.loads(request.body.decode('utf-8'))
        email = data.get('email', '')
        password = data.get('password', '')

        try:
            user_obj = User.objects.get(email=email,is_active=1)
            username = user_obj.username
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)

        user = authenticate(username=username, password=password)
        # print(f"User authenticated: {user}")  # Debugging line to check user authentication
        if user is not None:
            erpid = CustomUser.objects.filter(
                authid=user.pk).values_list('erpid', flat=True).first()
            grade = Employees.objects.filter(erp_id=erpid).values_list(
                'grade_id', flat=True).first()
            section = Employees.objects.filter(erp_id=erpid).values_list(
            'section_id', flat=True).first()
            sub_section = Employees.objects.filter(erp_id=erpid).values_list(
            'sub_section_id', flat=True).first()


            if erpid is not None:
                # return user details alongside token and success status
                payload = {
                    'success': True,
                    'user_id': user.pk,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'grade_id': grade,
                    'erpid': erpid,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_active': user.is_active,
                    'is_superuser': user.is_superuser,
                    'expires': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=getattr(settings, "JWT_EXP_DELTA_SECONDS", 3600))).isoformat(),
                    'section_id': section, # Add Section Id
                    'sub_section_id': sub_section, # Add Sub-Section Id (BP module scoping ke liye)
                }
                token = jwt.encode(
                    payload, settings.SECRET_KEY, algorithm='HS256')
                payload['token'] = token
                return JsonResponse({'success': True, 'user': payload}, status=200)
        else:
            return JsonResponse({'success': False, 'error': 'Invalid credentials'}, status=401)

    @require_GET
    def auth_users(request):
        records = User.objects.all()
        records_list = records.values(
            'id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_active', 'is_superuser'
        )
        # Add 'success': True and rename 'id' to 'user_id' for each user
        users_list = [
            {
                'success': True,
                'user_id': user['id'],
                'username': user['username'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'email': user['email'],
                'is_staff': user['is_staff'],
                'is_active': user['is_active'],
                'is_superuser': user['is_superuser'],
            }
            for user in records_list
        ]
        users_list = list(records_list)
        return JsonResponse(users_list, safe=False)  # Return as JSON response

    @csrf_exempt
    @require_POST
    def delete_user(request, user_id):
        if not user_id:
            return JsonResponse({'success': False, 'error': 'User ID is required'}, status=400)

        try:
            user = User.objects.get(pk=user_id)
            profile = CustomUser.objects.filter(authid=user_id).first()
            if profile:
                profile.delete()
            user.delete()
            return JsonResponse({'success': True}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)
   
    @csrf_exempt
    @require_POST
    def reset_password(request, user_id):
        if not user_id:
            return JsonResponse({'success': False, 'error': 'User ID is required'}, status=400)

        try:
            user = User.objects.get(pk=user_id)
            password = user.email
            user.set_password(password)
            user.save()
            return JsonResponse({'success': True}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)

    @csrf_exempt
    @require_POST
    def change_password(request):
        data = json.loads(request.body.decode('utf-8'))
        user_id = data.get('user_id')
        old_password = data.get('old_password')
        new_password1 = data.get('new_password1')
        new_password2 = data.get('new_password2')
        if not user_id or not old_password or not new_password1 or not new_password2:
            return JsonResponse({'success': False, 'error': 'All fields are required'}, status=400)
        try:
            user = User.objects.get(pk=user_id)
            if not user.check_password(old_password):
                return JsonResponse({'success': False, 'error': 'Old password is incorrect'}, status=400)
            if new_password1 != new_password2:
                return JsonResponse({'success': False, 'error': 'New passwords do not match'}, status=400)
            user.set_password(new_password1)
            user.save()
            return JsonResponse({'success': True, 'message': 'Password changed successfully'}, status=200)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'}, status=404)


class EmployeesView:
    def get(request):
        records = Employees.objects.all()
        records_list = records.values(
            'id', 'erp_id', 'hris_id', 'name', 'cnic', 'gender', 'section_id', 'location_id', 'grade_id', 'designation_id', 'position'
        )
        employees_list = list(records_list)
        # Return as JSON response
        return JsonResponse(employees_list, safe=False)

    @require_GET
    def ncc_employees(request):
        url = os.environ.get('SDXP_URL')
        session = SessionLocal()
        shift_employees_response = requests.get(f'{url}/ShiftRoster/GetShiftEmployees')
        try:
            shift_employees = shift_employees_response.json()
        except Exception:
            shift_employees = []
        # Filter only NCC employees
        ncc_employees = [emp for emp in shift_employees if emp.get('Shift_Type') == 'NCC']
        query = text("""
         SELECT
            e.name as empname,
            e.hris_id,
            s.[Sdxp_Username]
          FROM [dbo].[shift_user_map] s JOIN employees e ON e.erp_id= s.ErpID
        """)
        shiftdata = session.execute(query).fetchall()

        # Prepare sets for fast comparison (case-insensitive, strip spaces)
        ncc_names = set(str(emp.get('Name', '')).strip().lower() for emp in ncc_employees if emp.get('Name'))
        ncc_usernames = set(str(emp.get('Name', '')).strip().lower() for emp in ncc_employees if emp.get('Name'))

        matched_employees = []
        for row in shiftdata:
            empname = str(row.empname).strip().lower() if row.empname else ""
            sdxp_username = str(row.Sdxp_Username).strip().lower() if row.Sdxp_Username else ""
            # Compare Sdxp_Username and empname with NCC names
            if empname in ncc_names or sdxp_username in ncc_usernames:
                matched_employees.append({
                    "empname": row.empname,
                    "hris_id": row.hris_id
                })

        # Convert shiftdata to list of dicts (for original output)
        shiftdata_list = [
            dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
            for row in shiftdata
        ]
        return JsonResponse({'matched': matched_employees}, safe=False)
    
    @require_GET
    def rcc_employees(request):
        url = os.environ.get('SDXP_URL')
        session = SessionLocal()
        shift_employees_response = requests.get(f'{url}/ShiftRoster/GetShiftEmployees')
        try:
            shift_employees = shift_employees_response.json()
        except Exception:
            shift_employees = []
        # Filter only NCC employees
        ncc_employees = [emp for emp in shift_employees if emp.get('Shift_Type') == 'RCC']
        query = text("""
         SELECT
            e.name as empname,
            e.hris_id,
            s.[Sdxp_Username]
          FROM [dbo].[shift_user_map] s JOIN employees e ON e.erp_id= s.ErpID
        """)
        shiftdata = session.execute(query).fetchall()

        # Prepare sets for fast comparison (case-insensitive, strip spaces)
        ncc_names = set(str(emp.get('Name', '')).strip().lower() for emp in ncc_employees if emp.get('Name'))
        ncc_usernames = set(str(emp.get('Name', '')).strip().lower() for emp in ncc_employees if emp.get('Name'))

        matched_employees = []
        for row in shiftdata:
            empname = str(row.empname).strip().lower() if row.empname else ""
            sdxp_username = str(row.Sdxp_Username).strip().lower() if row.Sdxp_Username else ""
            # Compare Sdxp_Username and empname with NCC names
            if empname in ncc_names or sdxp_username in ncc_usernames:
                matched_employees.append({
                    "empname": row.empname,
                    "hris_id": row.hris_id
                })

        # Convert shiftdata to list of dicts (for original output)
        shiftdata_list = [
            dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
            for row in shiftdata
        ]
        return JsonResponse({'matched': matched_employees}, safe=False)

    @require_GET
    def get_employees(request):
        try:
            session = SessionLocal()

            # SQL with joins to fetch all employee attributes + section/location/grade/designation
            employees_query = text('''
                SELECT e.id, e.erp_id, e.hris_id, e.name, e.cnic, e.gender, 
                    e.section_id, e.location_id, e.grade_id, e.designation_id, 
                    e.position, e.flag,
                    s.name AS section_name,
                    l.name AS location_name,
                    g.name AS grade_name,
                    d.title AS designation_title
                FROM employees e
                LEFT JOIN sections s ON e.section_id = s.id
                LEFT JOIN locations l ON e.location_id = l.id
                LEFT JOIN grades g ON e.grade_id = g.id
                LEFT JOIN designations d ON e.designation_id = d.id
                
            ''')

            employees_data = session.execute(employees_query).fetchall()

            employees = [
                {
                    "id": row.id,
                    "erp_id": row.erp_id,
                    "hris_id": row.hris_id,
                    "name": row.name,
                    "cnic": row.cnic,
                    "gender": row.gender,
                    "position": row.position,
                    "flag": row.flag,
                    "section": {
                        "id": row.section_id,
                        "name": row.section_name
                    },
                    "location": {
                        "id": row.location_id,
                        "name": row.location_name
                    },
                    "grade": {
                        "id": row.grade_id,
                        "name": row.grade_name
                    },
                    "designation": {
                        "id": row.designation_id,
                        "title": row.designation_title
                    }
                }
                for row in employees_data
            ]

            return JsonResponse({"success": True, "employees": employees}, status=200)

        except Exception as e:
            import traceback
            print("Unexpected error in get_employees:", str(e))
            traceback.print_exc()
            return JsonResponse({"success": False, "error": str(e)}, status=500)

        finally:
            session.close()

    @csrf_exempt
    @require_POST
    def delete_employee(request, employee_id):
        if not employee_id:
            return JsonResponse({'success': False, 'error': 'Employee ID is required'}, status=400)

        try:
            employee = Employees.objects.get(pk=employee_id)
            authid= CustomUser.objects.filter(erpid=employee.erp_id).values_list('authid', flat=True).first()
     
            user= User.objects.get(pk=authid)
    
            if employee.flag==0:           
                user.is_active=1
                employee.flag=1
            else:
                employee.flag=0
                user.is_active=0
            user.save()
            employee.save()
            return JsonResponse({'success': True}, status=200)
        except Employees.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Employee not found'}, status=404)

    @require_GET
    def employees_summary(request):
        today = date.today()

        total_employees = Employees.objects.filter(flag=1).count()

        # Get unique user_ids from attendance where timestamp is today
        present_user_ids = Attendance.objects.filter(
            timestamp__date=today
        ).values_list('user_id', flat=True).distinct()

        present_count = present_user_ids.count()
        absent_count = total_employees - present_count

        summary = {
            "total_employees": total_employees,
            "present_today": present_count,
            "absent_today": absent_count
        }

        return JsonResponse(summary)

    @staticmethod
    def generate_random_hris_id(existing_ids):
        existing_ids_set = set(existing_ids)
        while True:
            new_id = random.randint(10000, 99999)
            if new_id not in existing_ids_set:
                return new_id

    @require_GET
    def get_details(request):
        sections_data = Sections.objects.all().values('id', 'name')
        sections = [
            {
                "id": section['id'],
                "name": section['name']
            }
            for section in sections_data
        ]

        # fetching location data
        location_query = text('''
            SELECT id, name FROM locations
        ''')
        grade_query = text('''
            SELECT id, name FROM grades
        ''')
        designation_query = text('''
            SELECT id, title FROM designations
        ''')
        session = SessionLocal()
        location_data = session.execute(location_query).fetchall()
        grade_data = session.execute(grade_query).fetchall()
        designation_data = session.execute(designation_query).fetchall()
        designations = [
            {
                "id": designation.id,
                "title": designation.title
            }
            for designation in designation_data
        ]
        grades = [
            {
                "id": grade.id,
                "name": grade.name
            }
            for grade in grade_data
        ]
        locations = [
            {
                "id": location.id,
                "name": location.name
            }
            for location in location_data
        ]
        # generate random HRIS id which is not in column
        existing_hris_ids = Employees.objects.values_list('hris_id', flat=True)
        new_hris_id = EmployeesView.generate_random_hris_id(existing_hris_ids)
        return JsonResponse({"success": True, "sections": sections, "locations": locations, "grades": grades, "designations": designations, "new_hris_id": new_hris_id})

    @csrf_exempt
    @require_POST
    def create_employee(request):
        data = json.loads(request.body.decode('utf-8'))
        # Validate required fields
        required_fields = [
            'erp_id', 'hris_id', 'name', 'cnic', 'gender',
            'section_id', 'location_id', 'grade_id', 'designation_id', 'position'
        ]
        for field in required_fields:
            if field not in data or data[field] in [None, ""]:
                return JsonResponse({"success": False, "error": f"Field '{field}' is required"}, status=400)

        try:
            employee = Employees.objects.create(
                erp_id=str(data['erp_id']),
                hris_id=int(data.get('hris_id', 0)),
                name=data.get('name', ''),
                cnic=data.get('cnic', ''),
                gender=data.get('gender', ''),
                section_id=int(data['section_id']),
                location_id=int(data['location_id']),
                grade_id=int(data['grade_id']),
                designation_id=int(data['designation_id']),
                position=data['position'],
                flag=1 if data.get('flag', False) else 0
            )
            return JsonResponse({"success": True, "message": "Employee created successfully", "employee_id": employee.pk}, status=201)
        except KeyError as e:
            return JsonResponse({"success": False, "error": f"Missing required field: {str(e)}"}, status=400)
        except ValueError as e:
            return JsonResponse({"success": False, "error": f"Invalid value: {str(e)}"}, status=400)

        except Exception as e:
            import traceback
            print("Unexpected error:", str(e))
            traceback.print_exc()   # <-- shows full traceback in console
            return JsonResponse({"success": False, "error": str(e)}, status=500)

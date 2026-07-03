from django.shortcuts import render
from .models import Attendance  # Assuming you have an Attendance model defined
from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from datetime import date, datetime, time, timedelta
from sqlalchemy import text
from django.views.decorators.csrf import csrf_exempt
from dotenv import load_dotenv
import os
import json
import requests  # Ensure you have requests installed in your environment
# Assuming you have a SessionLocal defined for database access
from db import SessionLocal
# Create your views here.
from leaves.models import LeaveModel
from holidays.models import Holiday

load_dotenv()  # Load environment variables from .env file
class AttendanceView:
    @require_GET  # Ensure this view only responds to GET requests
    def get(request):
        attendance_records = Attendance.objects.all()  # Fetch all attendance records
        records = attendance_records.values(
            'uid', 'user_id', 'timestamp', 'status', 'punch'
        )
        attendance_list = list(records)
        # Return as JSON response
        return JsonResponse(attendance_list, safe=False)

    @require_GET
    def todays_attendance(request):
        today = datetime.now().date()
        session = SessionLocal()
        records = []
        try:
            query = text("""
                SELECT
                    e.id AS id,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    s.name AS section,
                    a.uid AS uid,
                    e.hris_id AS user_id,
                    a.timestamp AS timestamp,
                    a.status AS status,
                    g.name AS grade,
                    a.lateintime AS lateintime
                FROM employees e
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = :today
                WHERE e.flag = 1  
                ORDER BY 
                    g.name DESC
            """)
            result = session.execute(query, {"today": today}).fetchall()
            for row in result:
                flag = 'Absent'
                if row.uid is not None:
                    flag = 'Present'
                else:

                    # Check leave
                    leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": today}).first()
                    official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": today}).first()

                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        # Check holiday
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": today}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'
                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'uid': row.uid,
                    'user_id': row.user_id,
                    'timestamp': '-' if row.timestamp is None else row.timestamp,
                    'late': 'early' if row.status == 'Early Checked Out' else '-' if row.timestamp is None else row.lateintime,
                    'status': '-' if row.status is None else row.status,
                    'flag': flag
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()

    @require_GET
    def attendance_overview(request, erpid):
        today = datetime.now().date()
        session = SessionLocal()
        section_query = text("""
            SELECT e.hris_id AS hrisid, s.name AS name
            FROM dbo.employees e
            JOIN dbo.sections s ON e.section_id = s.id
            WHERE e.erp_id = :erpid
        """)
        section_result = session.execute(section_query, {"erpid": erpid})
        row = section_result.first()
        if row:
            section_data = {"hrisid": row.hrisid, "name": row.name}
            query = text("""
                SELECT
                    e.id AS id,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    s.name AS section,
                    g.name AS grade,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time
                FROM employees e
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = :today
                WHERE e.section_id = (SELECT id FROM sections WHERE name = :section_name) and e.flag = 1
                GROUP BY 
                    e.id,
                    e.erp_id,
                    e.name,
                    d.title,
                    g.name,
                    s.name,
                    e.hris_id
                ORDER BY g.name desc
            """)

            result = session.execute(
                query, {"today": today, "section_name": row.name}).fetchall()
            records = []
            for row in result:
                # Integrate leave and holiday check for each employee for today
                flag = 'Absent'
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": today}).first()
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": today}).first()
                if row.checkin_time is not None or row.checkout_time is not None:
                    flag = 'Present'
                else:
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": today}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'
                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'section': row.section,
                    'grade': row.grade,
                    'checkin_time': row.checkin_time if row.checkin_time is not None else '-',
                    'checkout_time': row.checkout_time if row.checkout_time is not None else '-',
                    'flag': flag
                })
            return JsonResponse(records, safe=False)
        else:
            section_data = None
        return JsonResponse({"section": section_data}, safe=False)

    @csrf_exempt
    @require_POST
    def attendance_individual(request):
        data = json.loads(request.body)
        erpid = data.get('erpid')
        if not erpid:
            return JsonResponse({"error": "erpid is required"}, status=400)

        fromdate = data.get('fromdate')
        todate = data.get('todate')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                WITH date_range AS (
                    SELECT 
                        DATEADD(DAY, v.number, :fromdate) AS the_date
                    FROM master..spt_values v
                    WHERE v.type = 'P'
                        AND DATEADD(DAY, v.number, :fromdate) <= :todate
                )
                SELECT
                    dr.the_date,
                    e.id AS id,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    s.name AS section,
                    g.name AS grade,
                    a.uid AS uid,
                    e.hris_id AS user_id,
                    a.timestamp AS timestamp,
                    a.status AS status,
                    a.lateintime AS lateintime,
                    a.punch AS punch
                FROM date_range dr
                JOIN employees e ON 1=1
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = dr.the_date
                WHERE e.erp_id = :erpid AND e.flag = 1
                ORDER BY dr.the_date,
                         e.id,
                         CASE 
                             WHEN a.status = 'Checked In' THEN 0
                             WHEN a.status = 'Checked Out' THEN 1
                             ELSE 2
                         END,
                         a.timestamp
            """)

            result = session.execute(
                query, {"fromdate": fromdate, "todate": todate, "erpid": erpid})
            rows = result.fetchall()  # Ensure results are consumed before issuing new queries
            flag = 'Absent'
            for row in rows:
                check_in_deadline=time(9,0)
                check_out_deadline=time(14,30)
                if row.status == 'Checked In':
                    punch_time = row.timestamp.time() if row.timestamp else None
                    if punch_time and punch_time > check_in_deadline:
                        late_status = 'Late'
                    else:
                        late_status = 'On time'


                elif row.status == 'Checked Out':
                    punch_time = row.timestamp.time() if row.timestamp else None
                    if punch_time and punch_time < check_out_deadline:
                        late_status = 'Early'
                    else:
                        late_status = 'On time'
                else:
                    late_status = 'Early'
                    
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()
                
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()

                if row.uid is not None:
                    flag = 'Present'
                elif row.the_date:
                    # Check for leave on that specific date
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        # Check for holiday on that date
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": row.the_date}).first()

                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'

                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'section': row.section,
                    'grade': row.grade,
                    'uid': row.uid,
                    'user_id': row.user_id,
                    'timestamp': row.the_date if row.timestamp is None else row.timestamp,
                    'late': '-' if flag == 'Absent' else late_status,
                    'flag': flag,
                    'status': '-' if row.status is None else row.status,
                    'punch': row.punch
                })

            return JsonResponse(records, safe=False)
        finally:
            session.close()

    @csrf_exempt
    @require_POST
    def attendance_history(request):
        data = json.loads(request.body)
        fromdate = data.get('fromdate')
        todate = data.get('todate')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                WITH date_range AS (
                    SELECT 
                        DATEADD(DAY, v.number, :fromdate) AS the_date
                    FROM master..spt_values v
                    WHERE v.type = 'P'
                        AND DATEADD(DAY, v.number, :fromdate) <= :todate
                )
                SELECT
                    dr.the_date,
                    e.id AS id,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    g.name AS grade,
                    s.name AS section,
                    a.uid AS uid,
                    e.hris_id AS user_id,
                    a.timestamp AS timestamp,
                    a.status AS status,
                    a.lateintime AS lateintime,
                    a.punch AS punch
                FROM date_range dr
                JOIN employees e ON 1=1
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = dr.the_date
                WHERE e.flag = 1
                ORDER BY g.name DESC
            """)

            result = session.execute(
                query, {"fromdate": fromdate, "todate": todate})
            rows = result.fetchall()
            for row in rows:
                flag = 'Absent'
                check_in_deadline = time(8, 30)
                check_out_deadline = time(16, 0)
                if row.status == 'Checked In':
                    punch_time = row.timestamp.time() if row.timestamp else None
                    if punch_time and punch_time > check_in_deadline:
                        late_status = 'Late'
                    else:
                        late_status = 'On time'

                elif row.status == 'Checked Out':
                    punch_time = row.timestamp.time() if row.timestamp else None
                    if punch_time and punch_time < check_out_deadline:
                        late_status = 'Early'
                    else:
                        late_status = 'On time'
                else:
                    late_status = 'Early'
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()

                if row.uid is not None:
                    flag = 'Present'
                elif row.the_date:
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": row.the_date}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'

                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'uid': row.uid,
                    'user_id': row.user_id,
                    'timestamp': row.the_date if row.timestamp is None else row.timestamp,
                    'late': '-' if flag=='Absent' else late_status,
                    'flag': flag,
                    'status': '-' if row.status is None else row.status,
                    'punch': row.punch
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()
            
    @csrf_exempt
    @require_POST
    def attendance_detailed(request):
        data = json.loads(request.body)
        fromdate = data.get('fromdate')
        todate = data.get('todate')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                WITH date_range AS (
                    SELECT 
                        DATEADD(DAY, v.number, :fromdate) AS the_date
                    FROM master..spt_values v
                    WHERE v.type = 'P'
                        AND DATEADD(DAY, v.number, :fromdate) <= :todate
                )
                SELECT
                    dr.the_date,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    g.name AS grade,
                    s.name AS section,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time
                FROM date_range dr
                JOIN employees e ON 1=1
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = dr.the_date
                WHERE e.flag = 1
                GROUP BY 
                    dr.the_date,
                    e.id,
                    e.erp_id,
                    e.name,
                    d.title,
                    g.name,
                    s.name,
                    e.hris_id
                ORDER BY g.name DESC
            """)

            result = session.execute(
                query, {"fromdate": fromdate, "todate": todate})
            rows = result.fetchall()
            for row in rows:
                flag = 'Absent'
           
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": row.the_date}).first()
            
                if row.checkin_time is not None:
                    flag = 'Present'
                elif row.checkin_time is None and row.checkout_time is None:
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": row.the_date}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'
                if row.erp_id==471:
                    print(flag)
                records.append({
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'checkout_time': row.checkout_time if row.checkout_time is not None else '-',
                    'checkin_time': row.checkin_time if row.checkin_time is not None else '-',
                    'timestamp': row.the_date,
                    'late':  flag, 
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()
    
    @csrf_exempt
    @require_POST
    def attendance_team_level(request):
        data = json.loads(request.body)
        fromdate = data.get('fromdate')
        todate = data.get('todate')
        erp_id = data.get('erp_id')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                SELECT
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    g.name AS grade,
                    s.name AS section,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.lateintime END) AS lateintime,
                    CAST(a.timestamp AS DATE) AS timestamp,
                    MIN(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time
                FROM employees e
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) BETWEEN :fromdate AND :todate
                WHERE e.flag = 1 
                    AND e.section_id = (SELECT section_id FROM employees WHERE erp_id = :erpid)
                    AND e.grade_id <= (SELECT grade_id FROM employees WHERE erp_id = :erpid)
                GROUP BY 
                    e.erp_id, 
                    e.name, 
                    d.title, 
                    g.name, 
                    s.name, 
                    CAST(a.timestamp AS DATE)
                ORDER BY e.erp_id, timestamp
            """)

            result = session.execute(
                query, {"fromdate": fromdate, "todate": todate, "erpid": erp_id})
            rows = result.fetchall()
          
            for row in rows:
                flag = 'Absent'
                att_date = row.timestamp if row.timestamp else None
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": att_date}).first()
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": att_date}).first()

                if att_date is not None:
                    flag = 'Present'
                elif att_date:
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": att_date}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'

                records.append({
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'checkout_time': row.checkout_time if row.checkout_time is not None else '-',
                    'checkin_time': row.checkin_time if row.checkin_time is not None else '-',
                    'timestamp': row.timestamp if row.timestamp is not None else '-',
                    'late': '-' if flag=='Absent' else flag,
                    'lateintime': row.lateintime if row.lateintime is not None else '-',
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()
    
    
    @csrf_exempt
    @require_POST
    def attendance_individual_user(request):
        data = json.loads(request.body)
        fromdate = data.get('fromdate')
        todate = data.get('todate')
        erp_id = data.get('erp_id')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                SELECT
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    g.name AS grade,
                    s.name AS section,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.lateintime END) AS lateintime,
                    CAST(a.timestamp AS DATE) AS timestamp,
                    MIN(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time
                FROM employees e
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a 
                    ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) BETWEEN :fromdate AND :todate
                WHERE e.flag = 1 
                    AND e.erp_id = :erpid
                GROUP BY 
                    e.erp_id, 
                    e.name, 
                    d.title, 
                    g.name, 
                    s.name, 
                    CAST(a.timestamp AS DATE)
                ORDER BY timestamp
            """)

            result = session.execute(
                query, {"fromdate": fromdate, "todate": todate, "erpid": erp_id})
            rows = result.fetchall()
          
            for row in rows:
                flag = 'Absent'
                att_date = row.timestamp if row.timestamp else None
                leave_result = session.execute(text("""
                        SELECT leave_type FROM leaves
                        WHERE erp_id = :erp_id
                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                    """), {"erp_id": row.erp_id, "att_date": att_date}).first()
                official_work = session.execute(text("""
                                        SELECT leave_type FROM official_work_leaves
                                        WHERE erp_id = :erp_id
                                        AND CAST(start_date AS DATE) <= CAST(:att_date AS DATE)
                                        AND CAST(end_date AS DATE) >= CAST(:att_date AS DATE)
                                    """), {"erp_id": row.erp_id, "att_date": att_date}).first()

                if att_date is not None:
                    flag = 'Present'
                elif att_date:
                    if leave_result:
                        flag = leave_result.leave_type
                    elif official_work:
                        flag = official_work.leave_type
                    else:
                        holiday_result = session.execute(text("""
                            SELECT name FROM public_holidays
                            WHERE CAST(date AS DATE) = :att_date
                        """), {"att_date": att_date}).first()
                        if holiday_result:
                            flag = holiday_result.name
                        else:
                            flag = 'Absent'

                records.append({
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'checkout_time': row.checkout_time if row.checkout_time is not None else '-',
                    'checkin_time': row.checkin_time if row.checkin_time is not None else '-',
                    'timestamp': row.timestamp if row.timestamp is not None else '-',
                    'late': '-' if flag=='Absent' else flag,
                    'lateintime': row.lateintime if row.lateintime is not None else '-',
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()

    @csrf_exempt
    @require_POST
    def attendance_section(request):
        data = json.loads(request.body.decode('utf-8'))
        section = data.get('section')
        date = data.get('date')

        session = SessionLocal()
        records = []
        try:
            query = text("""
                SELECT
                    e.id AS id,
                    a.uid AS uid,
                    e.erp_id AS erp_id,
                    e.name AS name,
                    d.title AS designation,
                    g.name AS grade,
                    s.name AS section,
                    a.timestamp AS timestamp,
                    a.status AS status,
                    a.lateintime AS lateintime,
                    a.punch AS punch
                FROM employees e
                LEFT JOIN sections s ON s.id = e.section_id
                LEFT JOIN designations d ON d.id = e.designation_id
                LEFT JOIN grades g ON g.id = e.grade_id
                LEFT JOIN attendance a ON e.hris_id = a.user_id AND CAST(a.timestamp AS DATE) = :date
                WHERE s.id = :section
                   AND a.status IN ('Checked In', 'Checked Out', 'Early Checked Out') AND e.flag = 1
                ORDER BY g.name DESC
            """)
            result = session.execute(
                query, {"section": section, "date": date})
            for row in result:
                check_in_deadline = time(8, 30)
                check_out_deadline = time(16, 0)
                if row.status == 'Checked In':
                        punch_time = row.timestamp.time() if row.timestamp else None
                        if punch_time and punch_time > check_in_deadline:
                            late_status = 'Late'
                        else:
                            late_status = 'On time'

                elif row.status == 'Checked Out':
                        punch_time = row.timestamp.time() if row.timestamp else None
                        if punch_time and punch_time < check_out_deadline:
                            late_status = 'Early'
                        else:
                            late_status = 'On time'
                else:
                        late_status = 'Early'
                    
                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'timestamp': '-' if row.timestamp is None else row.timestamp,
                    'late': late_status,
                    'flag': 'Present' if row.uid is not None else 'Absent',
                    'status': '-' if row.status is None else row.status,
                    'punch': row.punch
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()

    @csrf_exempt
    @require_POST
    def attendance_status(request):
        data = json.loads(request.body.decode('utf-8'))
        section = data.get('section')
        status = data.get('status')
        date = data.get('date')

        session = SessionLocal()
        records = []
        try:
            # Determine which status to filter by
            if status.lower() == 'present':
                # Present: attendance entry exists for the date and section
                query = text("""
                    SELECT
                        e.id AS id,
                        a.uid AS uid,
                        e.erp_id AS erp_id,
                        e.name AS name,
                        g.name AS grade,
                        d.title AS designation,
                        s.name AS section,
                        a.timestamp AS timestamp,
                        a.status AS status,
                        a.lateintime AS lateintime
                    FROM employees e
                    LEFT JOIN sections s ON s.id = e.section_id
                    LEFT JOIN designations d ON d.id = e.designation_id
                    LEFT JOIN grades g ON g.id = e.grade_id
                    LEFT JOIN attendance a ON e.hris_id = a.user_id AND CAST(a.timestamp AS DATE) = :date
                    WHERE s.id = :section
                       AND a.uid IS NOT NULL
                       AND a.status IN ('Checked In', 'Checked Out', 'Early Checked Out') AND e.flag = 1
                    ORDER BY
                       g.name DESC
                """)
            elif status.lower() == 'absent':
                # Absent: no attendance entry for the date and section
                query = text("""
                    SELECT
                        e.id AS id,
                        NULL AS uid,
                        e.erp_id AS erp_id,
                        e.name AS name,
                        d.title AS designation,
                        g.name AS grade,
                        s.name AS section,
                        NULL AS timestamp,
                        NULL AS status,
                        NULL AS lateintime                   
                    FROM employees e
                    LEFT JOIN sections s ON s.id = e.section_id
                    LEFT JOIN designations d ON d.id = e.designation_id
                    LEFT JOIN grades g ON g.id = e.grade_id
                    LEFT JOIN attendance a ON e.hris_id = a.user_id AND CAST(a.timestamp AS DATE) = :date
                    WHERE s.id = :section
                      AND a.uid IS NULL
                      AND e.flag = 1
                    ORDER BY
                        g.name DESC
                """)
            else:
                # Default: show all with attendance entry for the date and section
                query = text("""
                    SELECT
                        e.id AS id,
                        a.uid AS uid,
                        e.erp_id AS erp_id,
                        e.name AS name,
                        d.title AS designation,
                        g.name AS grade,
                        s.name AS section,
                        a.timestamp AS timestamp,
                        a.status AS status,
                        a.lateintime AS lateintime
                    FROM employees e
                    LEFT JOIN sections s ON s.id = e.section_id
                    LEFT JOIN designations d ON d.id = e.designation_id
                    LEFT JOIN grades g ON g.id = e.grade_id
                    LEFT JOIN attendance a ON e.hris_id = a.user_id AND CAST(a.timestamp AS DATE) = :date
                    WHERE s.id = :section
                       AND a.status IN ('Checked In', 'Checked Out', 'Early Checked Out') AND e.flag = 1
                    ORDER BY
                        g.name DESC
                """)
            result = session.execute(
                query, {"section": section, "date": date})
            for row in result:

                records.append({
                    'id': row.id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.designation,
                    'grade': row.grade,
                    'section': row.section,
                    'timestamp': '-' if row.timestamp is None else row.timestamp,
                 
                    'flag': 'Present' if row.uid is not None else 'Absent',
                    
                })
            return JsonResponse(records, safe=False)
        finally:
            session.close()

    @require_GET
    def getshifts(request):
        session=SessionLocal()
        data=[]
        query=text("""
        SELECT MIN(id) AS id, MIN(Shift_Id) AS shift_id, Shift_Name AS name
FROM dbo.shift_user_map
GROUP BY Shift_Name;

        """)
        results=session.execute(query).fetchall()
        session.close()
        for row in results:
            data.append({
                'id': row.id,
                'shift_id': row.shift_id,
                'name': row.name
            })
        return JsonResponse(data, safe=False)


    @csrf_exempt
    @require_POST
    def shift_details(request):
        # Parse JSON body
        try:
            data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            print("Invalid JSON format in request body")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        shiftid = data.get('shiftid')
        date_str = data.get('date')
        if not shiftid or not date_str:
            print("Missing shiftid or date in request")
            return JsonResponse({"error": "Missing shiftid or date"}, status=400)

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            print(f"Invalid date format: {date_str}")
            return JsonResponse({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Fetch shift details from external API
        url = os.environ.get('SDXP_URL')
        if not url:
            print("SDXP_URL not set in environment variables")
            return JsonResponse({"error": "SDXP_URL not set"}, status=500)

        try:
            response = requests.post(
                f'{url}/ShiftRoster/GetShiftDetails',
                json={"shiftid": shiftid, "date": date_str},
                timeout=5
            )
            response.raise_for_status()
            shift_details = response.json()
            if not shift_details or not isinstance(shift_details, list):
                print("Invalid or empty shift details from API")
                return JsonResponse({"error": "Invalid shift details"}, status=502)
        except requests.RequestException as e:
            print(f"Failed to fetch shift details: {str(e)}")
            return JsonResponse({"error": f"Failed to fetch shift details: {str(e)}"}, status=502)

        # Create mapping of User_Name to Shift_Type and shift times
        shift_type_map = {}
        shift_time_map = {}
        for entry in shift_details:
            user_name = entry.get('User_Name')
            if user_name:
                if user_name not in shift_type_map:
                    shift_type_map[user_name] = entry.get('Shift_Type', '-')
                    shift_time_map[user_name] = {
                        'Start_Time': entry.get('Start_Time'),
                        'End_Time': entry.get('End_Time')
                    }

        session = SessionLocal()
        try:
            # Bulk fetch leaves and holidays
            leaves = {row.erp_id: row.leave_type for row in session.execute(
                text("SELECT erp_id, leave_type FROM leaves WHERE CAST(start_date AS DATE) <= :att_date AND CAST(end_date AS DATE) >= :att_date"),
                {"att_date": date_obj}
            ).fetchall()}
            official_leaves = {row.erp_id: row.leave_type for row in session.execute(
                text("SELECT erp_id, leave_type FROM official_work_leaves WHERE CAST(start_date AS DATE) <= :att_date AND CAST(end_date AS DATE) >= :att_date"),
                {"att_date": date_obj}
            ).fetchall()}
            holiday = session.execute(
                text("SELECT name FROM public_holidays WHERE CAST(date AS DATE) = :att_date"),
                {"att_date": date_obj}
            ).first()
            holiday_name = holiday.name if holiday else None

            # Updated SQL query to match shift_history
            query = text("""
                SELECT 
                    s.Shift_Id,
                    e.erp_id,
                    e.name,
                    s.Sdxp_Username AS user_name,
                    d.title AS title,
                    CAST(a.timestamp AS DATE) AS attendance_date,
                    g.name AS grade,
                    sec.name AS section,
                    s.Shift_Name,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time,
                    STRING_AGG(a.status, ', ') AS status
                FROM employees e 
                JOIN shift_user_map s ON s.ErpID = e.erp_id
                LEFT JOIN attendance a ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) = :att_date
                JOIN sections sec ON e.section_id = sec.id
                JOIN designations d ON e.designation_id = d.id
                JOIN grades g ON e.grade_id = g.id
                WHERE e.flag = 1 
                    AND s.Shift_Id = :shiftid
                GROUP BY 
                    s.Shift_Id,
                    e.erp_id,
                    e.name,
                    s.Sdxp_Username,
                    d.title,
                    g.name,
                    sec.name,
                    s.Shift_Name,
                    CAST(a.timestamp AS DATE)
                ORDER BY g.name DESC, attendance_date
            """)
            attendance_records = session.execute(
                query, {"shiftid": shiftid, "att_date": date_obj}).fetchall()

            def get_late_status(row, user_name):
                if not row.checkin_time and not row.checkout_time:
                    return '-'
                if user_name not in shift_time_map:
                    print(f"No shift times for user_name: {user_name}")
                    return '-'
                try:
                    shift_times = shift_time_map[user_name]
                    shift_start = shift_times['Start_Time']
                    shift_end = shift_times['End_Time']
                    status_parts = []
                    if row.checkin_time:
                        shift_start_time = (datetime.strptime(
                            shift_start, "%I:%M %p") + timedelta(minutes=30)).time()
                        checkin_time = row.checkin_time.time()
                        if checkin_time <= shift_start_time:
                            status_parts.append('On Time-In')
                        else:
                            status_parts.append('Late In')
                    if row.checkout_time:
                        end_time = datetime.strptime(shift_end, "%I:%M %p").time()
                        checkout_time = row.checkout_time.time()
                        if checkout_time < end_time:
                            status_parts.append('Early Out')
                        else:
                            status_parts.append('On Time-Out')
                    return ', '.join(status_parts) if status_parts else '-'
                except ValueError as e:
                    print(
                        f"Invalid time format for user_name: {user_name}, times: {shift_times}, error={e}")
                    return '-'

            attendance_records = [
                {
                    'shift_id': row.Shift_Id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.title,
                    'grade': row.grade,
                    'section': row.section,
                    'shiftname': row.Shift_Name,
                    'shifttype': shift_type_map.get(row.user_name, '-'),
                    'checkin_time': row.checkin_time.strftime("%Y-%m-%d %H:%M:%S") if row.checkin_time else None,
                    'checkout_time': row.checkout_time.strftime("%Y-%m-%d %H:%M:%S") if row.checkout_time else None,
                    'status': '-' if row.status is None else row.status,
                    'timestamp': row.attendance_date.strftime("%Y-%m-%d") if row.attendance_date else None,
                    'lateintime': get_late_status(row, row.user_name),
                    'flag': (
                        'Present' if row.checkin_time or row.checkout_time
                        else leaves.get(row.erp_id) or
                        official_leaves.get(row.erp_id) or
                        holiday_name or 'Absent'
                    )
                } for row in attendance_records
            ]
            return JsonResponse({'attendance': attendance_records}, safe=False, status=200)
        except Exception as e:
            print(f"Database error occurred: {str(e)}")
            return JsonResponse({"error": f"Database error occurred: {str(e)}"}, status=500)
        finally:
            session.close()
      
    @csrf_exempt
    @require_POST
    def shift_history(request):
        """
        Retrieve shift history and attendance details for a given shift and date range.
        
        Args:
            request: HTTP POST request with JSON body containing:
                - shiftid (str): ID of the shift
                - fromdate (str): Start date in YYYY-MM-DD format
                - todate (str): End date in YYYY-MM-DD format
        
        Returns:
            JsonResponse: Attendance records with details like check-in/out times, status, shifttype, and flags.
        """
        try:
            data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            print("Invalid JSON format in request body")
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        shiftid = data.get('shiftid')
        fromdate_str = data.get('fromdate')
        todate_str = data.get('todate')

        if not all([shiftid, fromdate_str, todate_str]):
            print("Missing required fields: shiftid, fromdate, todate")
            return JsonResponse({"error": "Missing required fields: shiftid, fromdate, todate"}, status=400)

        try:
            from_date_obj = datetime.strptime(fromdate_str, "%Y-%m-%d").date()
            to_date_obj = datetime.strptime(todate_str, "%Y-%m-%d").date()
        except ValueError:
            print(
                f"Invalid date format: fromdate={fromdate_str}, todate={todate_str}")
            return JsonResponse({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        url = os.environ.get('SDXP_URL')
        if not url:
            print("SDXP_URL not set in environment variables")
            return JsonResponse({"error": "SDXP_URL not set"}, status=500)

        # Fetch shift details
        try:
            response = requests.post(
                f'{url}/ShiftRoster/ShiftDetailed',
                json={"shiftid": shiftid, "fromdate": fromdate_str,
                    "todate": todate_str},
                timeout=5
            )
            response.raise_for_status()
            shift_details = response.json()
            if not shift_details or not isinstance(shift_details, list):
                print("Invalid or empty shift details from API")
                return JsonResponse({"error": "Invalid shift details from API"}, status=502)
        except requests.RequestException as e:
            print(f"Failed to fetch shift details: {str(e)}")
            return JsonResponse({"error": f"Failed to fetch shift details: {str(e)}"}, status=502)

        # Create mapping of User_Name to Shift_Type and shift times
        shift_type_map = {}
        shift_time_map = {}
        for entry in shift_details:
            user_name = entry.get('User_Name')
            if user_name:
                # Prioritize first occurrence (or adjust for RCC/NCC priority if needed)
                if user_name not in shift_type_map:
                    shift_type_map[user_name] = entry.get('Shift_Type', '-')
                    shift_time_map[user_name] = {
                        'Start_Time': entry.get('Start_Time', ''),
                        'End_Time': entry.get('End_Time', '')
                    }

        session = SessionLocal()
        try:
            # Bulk fetch leaves and holidays
            leaves = {row.erp_id: row.leave_type for row in session.execute(
                text("SELECT erp_id, leave_type FROM leaves WHERE CAST(start_date AS DATE) <= :todate AND CAST(end_date AS DATE) >= :fromdate"),
                {"fromdate": from_date_obj, "todate": to_date_obj}
            ).fetchall()}
            official_leaves = {row.erp_id: row.leave_type for row in session.execute(
                text("SELECT erp_id, leave_type FROM official_work_leaves WHERE CAST(start_date AS DATE) <= :todate AND CAST(end_date AS DATE) >= :fromdate"),
                {"fromdate": from_date_obj, "todate": to_date_obj}
            ).fetchall()}
            holidays = {row.date: row.name for row in session.execute(
                text("SELECT CAST(date AS DATE) AS date, name FROM public_holidays WHERE CAST(date AS DATE) BETWEEN :fromdate AND :todate"),
                {"fromdate": from_date_obj, "todate": to_date_obj}
            ).fetchall()}

            # Main query with s.Sdxp_Username for shifttype
            query = text("""
                SELECT 
                    s.Shift_Id,
                    e.erp_id,
                    e.name,
                    s.Sdxp_Username AS user_name,
                    d.title AS title,
                    CAST(a.timestamp AS DATE) AS attendance_date,
                    g.name AS grade,
                    sec.name AS section,
                    s.Shift_Name,
                    MAX(CASE WHEN a.status = 'Checked In' THEN a.timestamp END) AS checkin_time,
                    MAX(CASE WHEN a.status IN ('Checked Out', 'Early Checked Out') THEN a.timestamp END) AS checkout_time,
                    STRING_AGG(a.status, ', ') AS status
                FROM employees e 
                JOIN shift_user_map s ON s.ErpID = e.erp_id
                LEFT JOIN attendance a ON e.hris_id = a.user_id 
                    AND CAST(a.timestamp AS DATE) BETWEEN :fromdate AND :todate
                JOIN sections sec ON e.section_id = sec.id
                JOIN designations d ON e.designation_id = d.id
                JOIN grades g ON e.grade_id = g.id
                WHERE e.flag = 1 
                    AND s.Shift_Id = :shiftid
                GROUP BY 
                    s.Shift_Id,
                    e.erp_id,
                    e.name,
                    s.Sdxp_Username,
                    d.title,
                    g.name,
                    sec.name,
                    s.Shift_Name,
                    CAST(a.timestamp AS DATE)
                ORDER BY g.name DESC, attendance_date
            """)
            attendance_records = session.execute(
                query, {"shiftid": shiftid,
                        "fromdate": from_date_obj, "todate": to_date_obj}
            ).fetchall()

            def get_late_status(row, user_name):
                if not row.checkin_time and not row.checkout_time:
                    return '-'
                if user_name not in shift_time_map:
                    print(f"No shift times for user_name: {user_name}")
                    return '-'
                try:
                    shift_times = shift_time_map[user_name]
                    shift_start = shift_times['Start_Time']
                    shift_end = shift_times['End_Time']
                    if not shift_start or not shift_end:
                        print(
                            f"Missing Start_Time or End_Time for user_name: {user_name}")
                        return '-'
                    status_parts = []
                    if row.checkin_time:
                        shift_start_time = (datetime.strptime(
                            shift_start, "%I:%M %p") + timedelta(minutes=30)).time()
                        checkin_time = row.checkin_time.time()
                        if checkin_time <= shift_start_time:
                            status_parts.append('On Time-In')
                        else:
                            status_parts.append('Late In')
                    if row.checkout_time:
                        end_time = datetime.strptime(shift_end, "%I:%M %p").time()
                        checkout_time = row.checkout_time.time()
                        if checkout_time < end_time:
                            status_parts.append('Early Out')
                        else:
                            status_parts.append('On Time-Out')
                    return ', '.join(status_parts) if status_parts else '-'
                except ValueError as e:
                    print(
                        f"Invalid time format for user_name: {user_name}, times: {shift_times}, error={e}")
                    return '-'

            attendance_records = [
                {
                    'shift_id': row.Shift_Id,
                    'erp_id': row.erp_id,
                    'name': row.name,
                    'designation': row.title,
                    'grade': row.grade,
                    'section': row.section,
                    'shiftname': row.Shift_Name,
                    'shifttype': shift_type_map.get(row.user_name, '-'),
                    'checkin_time': row.checkin_time.strftime("%Y-%m-%d %H:%M:%S") if row.checkin_time else None,
                    'checkout_time': row.checkout_time.strftime("%Y-%m-%d %H:%M:%S") if row.checkout_time else None,
                    'status': '-' if row.status is None else row.status,
                    'timestamp': row.attendance_date.strftime("%Y-%m-%d") if row.attendance_date else None,
                    'lateintime': get_late_status(row, row.user_name),
                    'flag': (
                        'Present' if row.checkin_time or row.checkout_time
                        else leaves.get(row.erp_id) or
                        official_leaves.get(row.erp_id) or
                        holidays.get(row.attendance_date,
                                    'Absent') if row.attendance_date else 'Absent'
                    )
                } for row in attendance_records
            ]
            # Print shift type lookups for debugging
            for record in attendance_records:
                print(
                    f"Shift type lookup: user_name={record['name']}, shifttype={record['shifttype']}")
            return JsonResponse({'attendance': attendance_records}, safe=False, status=200)
        except Exception as e:
            print(f"Database query failed: {str(e)}")
            return JsonResponse({"error": f"Database query failed: {str(e)}"}, status=500)
        finally:
            session.close()
    
    @csrf_exempt
    @require_POST
    def current_attendance(request):
        # Your logic for handling current attendance
        try:
            request_data = json.loads(request.body.decode('utf-8'))
        except Exception as e:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        empid = request_data.get("empid")
        date = request_data.get("date")
        if not empid or not date:
            return JsonResponse({"error": "empid and date are required"}, status=400)

        # Fetch current attendance data from the database
        session = SessionLocal()
        try:
            query = text("""
                SELECT 
                    MIN(CASE WHEN status = 'Checked In' THEN timestamp END) AS checkin_time,
                    MAX(CASE WHEN status IN ('Checked Out', 'Early Checked Out') THEN timestamp END) AS checkout_time,
                    MIN(id) AS id,
                    MIN(uid) AS uid,
                    user_id,
                    MIN(punch) AS punch,
                    MIN(lateintime) AS lateintime
                FROM [dbo].[attendance]
                WHERE user_id = :empid 
                AND CAST(timestamp AS DATE) = :date
                GROUP BY user_id
            """)
            result = session.execute(query, {"empid": empid, "date": date})
            attendance = result.fetchall()
            # Serialize attendance rows to dicts
            attendance_list = [
                {
                    "id": row.id,
                    "uid": row.uid,
                    "user_id": row.user_id,
                    "checkin_time": row.checkin_time.isoformat() if row.checkin_time else None,
                    "checkout_time": row.checkout_time.isoformat() if row.checkout_time else None,
                    "status": (
                        "Present" if row.checkin_time or row.checkout_time else "Absent"
                    ),
                    "punch": row.punch,
                    "lateintime": row.lateintime
                }
                for row in attendance
            ]
            return JsonResponse({"attendance": attendance_list}, status=200)
        except Exception as e:
            return JsonResponse({"error": "Attendance not found"}, status=404)
        finally:
            session.close()
    
    @csrf_exempt
    @require_POST
    def shift_add(request):
        try:
            request_data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        empid = request_data.get("employeeId")
        date_str = request_data.get("date")
        check_in_str = request_data.get("checkIn")
        check_out_str = request_data.get("checkOut")
        if not empid or not date_str or not check_in_str or not check_out_str:
            return JsonResponse({"error": "All fields are required"}, status=400)

        try:
            # Parse date and time, combine to datetime
            # Accepts check_in/check_out as "HH:MM" or "HH:MM:SS"
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Date must be in YYYY-MM-DD format"}, status=400)
            try:
                check_in_time = datetime.strptime(check_in_str, "%H:%M").time()
            except ValueError:
                try:
                    check_in_time = datetime.strptime(check_in_str, "%H:%M:%S").time()
                except ValueError:
                    return JsonResponse({"error": "CheckIn time must be in HH:MM or HH:MM:SS format"}, status=400)
            try:
                check_out_time = datetime.strptime(check_out_str, "%H:%M").time()
            except ValueError:
                try:
                    check_out_time = datetime.strptime(check_out_str, "%H:%M:%S").time()
                except ValueError:
                    return JsonResponse({"error": "CheckOut time must be in HH:MM or HH:MM:SS format"}, status=400)

            check_in_dt = datetime.combine(date_obj, check_in_time)
            check_out_dt = datetime.combine(date_obj, check_out_time)

            uid_list = Attendance.objects.all().values_list('uid', flat=True)
            unique_uid = AttendanceView.get_random_uid(uid_list)
            new_shift = Attendance.objects.create(
                uid=unique_uid,
                user_id=empid,
                timestamp=check_in_dt,
                status='Checked In',
                punch=1,
                lateintime=''
            )
            new_shift_out = Attendance.objects.create(
                uid=unique_uid,
                user_id=empid,
                timestamp=check_out_dt,
                status='Checked Out',
                punch=1,
                lateintime=''
            )
            return JsonResponse({"message": "Shift added successfully"}, status=201)
        except Exception as e:
            print(f"Error adding shift: {e}")
            return JsonResponse({"error": f"Failed to add shift {e}"}, status=500)
    
    @csrf_exempt
    @require_POST
    def shift_update(request):
        try:
            request_data = json.loads(request.body.decode('utf-8'))
        except Exception:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)
        empid = request_data.get("employeeId")
        date_str = request_data.get("date")
        check_in_str = request_data.get("checkIn")
        check_out_str = request_data.get("checkOut")
        if not empid or not date_str or not check_in_str or not check_out_str:
            return JsonResponse({"error": "All fields are required"}, status=400)

        try:
            # Parse date and time, combine to datetime
            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return JsonResponse({"error": "Date must be in YYYY-MM-DD format"}, status=400)
            try:
                check_in_time = datetime.strptime(check_in_str, "%H:%M").time()
            except ValueError:
                try:
                    check_in_time = datetime.strptime(check_in_str, "%H:%M:%S").time()
                except ValueError:
                    return JsonResponse({"error": "CheckIn time must be in HH:MM or HH:MM:SS format"}, status=400)
            try:
                check_out_time = datetime.strptime(check_out_str, "%H:%M").time()
            except ValueError:
                try:
                    check_out_time = datetime.strptime(check_out_str, "%H:%M:%S").time()
                except ValueError:
                    return JsonResponse({"error": "CheckOut time must be in HH:MM or HH:MM:SS format"}, status=400)

            check_in_dt = datetime.combine(date_obj, check_in_time)
            check_out_dt = datetime.combine(date_obj, check_out_time)

            # Update Checked In record if exists, else create
            checkin_qs = Attendance.objects.filter(
                user_id=empid,
                status='Checked In',
                timestamp__date=date_obj
            )
            if checkin_qs.exists():
                checkin_qs.update(
                    timestamp=check_in_dt,
                    punch=1,
                    lateintime=''
                )
            else:
                uid_list = Attendance.objects.all().values_list('uid', flat=True)
                unique_uid = AttendanceView.get_random_uid(uid_list)
                Attendance.objects.create(
                    uid=unique_uid,
                    user_id=empid,
                    timestamp=check_in_dt,
                    status='Checked In',
                    punch=1,
                    lateintime=''
                )

            # Update Checked Out record if exists, else create
            checkout_qs = Attendance.objects.filter(
                user_id=empid,
                status='Checked Out',
                timestamp__date=date_obj
            )
            if checkout_qs.exists():
                checkout_qs.update(
                    timestamp=check_out_dt,
                    punch=1,
                    lateintime=''
                )
            else:
                uid_list = Attendance.objects.all().values_list('uid', flat=True)
                unique_uid = AttendanceView.get_random_uid(uid_list)
                Attendance.objects.create(
                    uid=unique_uid,
                    user_id=empid,
                    timestamp=check_out_dt,
                    status='Checked Out',
                    punch=1,
                    lateintime=''
                )

            return JsonResponse({"message": "Shift updated successfully"}, status=200)
        except Exception as e:
            print(f"Error updating shift: {e}")
            return JsonResponse({"error": f"Failed to update shift {e}"}, status=500)

    @staticmethod
    def get_random_uid(uid_list):
        if not uid_list:
            return 1
        return max(uid_list) + 1
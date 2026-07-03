from django.urls import path
from .views import AttendanceView

urlpatterns = [
    path('get/', AttendanceView.get),
    path('today/', AttendanceView.todays_attendance),
    path('overview/<int:erpid>/', AttendanceView.attendance_overview),
    path('history/', AttendanceView.attendance_history),
    path('sections/', AttendanceView.attendance_section),
    path('status/', AttendanceView.attendance_status),
    path('individual/', AttendanceView.attendance_individual),
    path('detailed/', AttendanceView.attendance_detailed),
    path('team-level/', AttendanceView.attendance_team_level),
    path('individual-user/', AttendanceView.attendance_individual_user),
    path('get-shifts/', AttendanceView.getshifts),
    path('shift-details/', AttendanceView.shift_details),
    path('shift-history/', AttendanceView.shift_history),
    path('current_attendance/', AttendanceView.current_attendance),
    path('shift_add/', AttendanceView.shift_add),
    path('shift_update/', AttendanceView.shift_update),
]

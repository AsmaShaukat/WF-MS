from django.urls import path
from .views import get_leave_requests, get_leaves_count, create_leave_request, handle_leave_request, individual_report, section_leave_report, individual_detail_report, leavetype_detail_report

urlpatterns = [
    path("get/<int:erpid>/", get_leave_requests, name="get_leave_requests"),
    path("apply/", create_leave_request, name="create_leave_request"),
    path("history/", get_leaves_count, name="get_leaves_count"),
    path("individual-report/", individual_report, name="individual_report"),
    path("individual-detail-report/", individual_detail_report, name="individual_detail_report"),
    path("leavetype-detail-report/", leavetype_detail_report,
         name="leavetype_detail_report"),
    path("section-leave-report/", section_leave_report, name="section_leave_report"),
    path("approve/", handle_leave_request, name="handle_leave_request"),
]
from django.urls import path
from .views import get_leave_requests, create_official_work_request,handle_leave_request

urlpatterns = [
    path("get/<int:erpid>/", get_leave_requests, name="get_leave_requests"),
    path("apply/", create_official_work_request, name="create_official_work_request"),
    path("handle/", handle_leave_request, name="handle_leave_request"),

]
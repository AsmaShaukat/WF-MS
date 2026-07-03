from django.urls import path
from . import views

urlpatterns = [
    path('my/',              views.get_my_activities),
    path('submit/',          views.submit_activity),
    path('update/<int:pk>/', views.update_activity),
    path('delete/<int:pk>/', views.delete_activity),
    path('bp-tasks/',        views.get_bp_tasks),
     path('report/',              views.get_activities_report),
    path('section-employees/',   views.get_section_employees),
]
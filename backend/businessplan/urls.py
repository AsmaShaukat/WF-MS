from django.urls import path
from . import views

urlpatterns = [
    path('all/',             views.get_all),
    path('upload/',          views.upload_excel),
    path('update/<int:pk>/', views.update_row),
    path('delete/<int:pk>/', views.delete_row),
    path('add/', views.add_row),
    path('delete-all/', views.delete_all),
    path('main-task-report/', views.get_main_task_report),
]
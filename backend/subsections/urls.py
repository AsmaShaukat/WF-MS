from django.urls import path
from . import views

urlpatterns = [
    path('',              views.get_sub_sections),
    path('create/',       views.create_sub_section),
    path('<int:pk>/',     views.get_sub_section_detail),
    path('update/<int:pk>/', views.update_sub_section),
    path('delete/<int:pk>/', views.delete_sub_section),
]

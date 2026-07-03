from django.urls import path,include
from .views import SectionsView

urlpatterns = [
    path('get/', SectionsView.get_sections),
]
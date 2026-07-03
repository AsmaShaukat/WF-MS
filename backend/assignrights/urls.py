from django.urls import path, include
from .views import AssignRightsView
urlpatterns = [
    path('create/', AssignRightsView.create),
    path('get/<int:id>/', AssignRightsView.get),
    path('delete/<int:id>/', AssignRightsView.delete),
]

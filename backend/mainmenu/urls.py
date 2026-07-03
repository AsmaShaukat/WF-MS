from django.urls import path,include
from .views import MainMenuView
urlpatterns=[
    path('get/', MainMenuView.get),
    path('create/', MainMenuView.create),
    path('update/<int:id>/', MainMenuView.update),
    path('delete/<int:id>/', MainMenuView.delete),
    path('record/<int:id>/', MainMenuView.get_record),
]
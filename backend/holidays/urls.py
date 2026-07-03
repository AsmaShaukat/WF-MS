from django.urls import path
from .views import get_holidays, add_holiday, delete_holiday,get_holiday,update_holiday

urlpatterns = [

 path('get/', get_holidays, name='get_holidays'),
    path('store/', add_holiday, name='add_holiday'),
    path('delete/<int:holiday_id>/', delete_holiday, name='delete_holiday'),
    path('get/<int:holiday_id>/', get_holiday, name='get_holiday'),
    path('update/<int:holiday_id>/', update_holiday, name='update_holiday'),
]

from django.urls import path, include

from .views import UsersView, EmployeesView
urlpatterns = [
    path('get/', UsersView.get),  # Include the users app URLs
    path('employees/', EmployeesView.get),  # Include the employees app URLs
    path('details/', EmployeesView.get_details),  # add employee
    path('create_employee/', EmployeesView.create_employee),  # Include the create employee URL
    # Include the create employee URL
    path('get_employees/', EmployeesView.get_employees),
    path('delete_employee/<int:employee_id>/', EmployeesView.delete_employee),
    # Include the employees app URLs
    path('info/', EmployeesView.employees_summary),
    path('create_user/', UsersView.create_user),  # Include the create user URL
    path('signup_user/', UsersView.signup_user),  # Include the signup user URL
    path('login/', UsersView.login_user),  # Include the login URL
    path('change-password/',UsersView.change_password),  # Include the change password URL
    path('get_auth_users/', UsersView.auth_users),  # Include the login URL
    path('delete_user/<int:user_id>/', UsersView.delete_user),  # Include the login URL
    path('reset_password/<int:user_id>/', UsersView.reset_password),  # Include the login URL
    path('ncc_employees/', EmployeesView.ncc_employees),  # Include the NCC employees URL
    path('rcc_employees/', EmployeesView.rcc_employees),  # Include the RCC employees URL
]
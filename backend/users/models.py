from django.db import models


class Employees(models.Model):
    # assuming it's an auto-increment primary key

    erp_id = models.IntegerField()
    hris_id = models.IntegerField()
    name = models.CharField(max_length=100)
    cnic = models.CharField(max_length=15)
    gender = models.CharField(max_length=1)
    section_id = models.IntegerField()
    location_id = models.IntegerField()
    grade_id = models.IntegerField()
    designation_id = models.IntegerField()
    position = models.CharField(max_length=100)
    flag=models.IntegerField(default=0)
    sub_section_id = models.BigIntegerField(null=True, blank=True)


    class Meta:
        db_table = 'employees'
        managed=True
        
class Users(models.Model):
    uid = models.AutoField(primary_key=True)
    user_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=100)
    privilege = models.IntegerField()
    password = models.CharField(max_length=100)
    group_id = models.IntegerField(null=True, blank=True)
    card = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'users'

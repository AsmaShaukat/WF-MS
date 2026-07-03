from django.db import models
from django.contrib.auth.models import User
# Create your models here.
class CustomUser(models.Model):
    authid = models.IntegerField()
    erpid = models.IntegerField()

    class Meta:
        db_table = 'profiles'
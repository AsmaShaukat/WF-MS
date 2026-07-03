from django.db import models


class Grades(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'grades'

class Designations(models.Model):
    title = models.CharField(max_length=250, unique=True)

    class Meta:
        db_table = 'designations'
        
# Create your models here.
class Sections(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'sections'
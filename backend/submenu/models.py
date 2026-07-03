from django.db import models

# Create your models here.
class SubMenuModel(models.Model):
    main_menu = models.IntegerField()
    sub_menu = models.CharField(max_length=100, unique=True)
    uri = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sub_menu'

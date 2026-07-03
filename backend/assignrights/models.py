from django.db import models

# Create your models here.
class AssignRightsModel(models.Model):
    user_id = models.IntegerField()
    main_menu = models.IntegerField()
    sub_menu = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assign_rights'

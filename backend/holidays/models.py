from django.db import models

class Holiday(models.Model):
    name = models.CharField(max_length=255)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)


    class Meta:
        db_table = 'public_holidays'
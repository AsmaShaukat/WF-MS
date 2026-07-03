from django.db import models



class Attendance(models.Model):
    uid = models.IntegerField()
    user_id = models.IntegerField()
    timestamp = models.DateTimeField()
    status = models.CharField(max_length=250)
    punch = models.IntegerField(null=True, blank=True)
    lateintime = models.CharField(max_length=250, null=True, blank=True)
    
    class Meta:
        db_table = 'attendance'

from django.db import models
from users.models import User

# Create your models here.
class Tournament(models.Model):
    name = models.CharField(max_length=255)
    participants = models.ManyToManyField(User, related_name='tournaments')
    start_time = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

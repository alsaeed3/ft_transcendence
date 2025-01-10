from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

# Create your models here.

class user_profile(models.Model):
	users = models.ForeignKey(User, on_delete=models.CASCADE)
	profile_pic = models.ImageField(upload_to='profile_pics', blank=True)
	friends_list = models.ManyToManyField('self', blank=True)
	games_played = models.IntegerField(default=0)
	games_won = models.IntegerField(default=0)
	games_lost = models.IntegerField(default=0)
	games_drawn = models.IntegerField(default=0)
	experience = models.IntegerField(default=0)
	level = models.IntegerField(default=1)
	tier = models.CharField(max_length=20, default='Bronze')
	created_at = models.DateTimeField(default=datetime.now, blank=True)
	
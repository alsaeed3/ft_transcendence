from django.db import models
from django.contrib.auth.models import User
from datetime import datetime
from django.contrib.auth.models import AbstractUser

# Create your models here.

# class user_profile(models.Model):
# 	users = models.ForeignKey(User, on_delete=models.CASCADE)
# 	profile_pic = models.ImageField(upload_to='profile_pics', blank=True)
# 	friends_list = models.ManyToManyField('self', blank=True)
# 	games_played = models.IntegerField(default=0)
# 	games_won = models.IntegerField(default=0)
# 	games_lost = models.IntegerField(default=0)
# 	games_drawn = models.IntegerField(default=0)
# 	experience = models.IntegerField(default=0)
# 	level = models.IntegerField(default=1)
# 	tier = models.CharField(max_length=20, default='Bronze')
# 	created_at = models.DateTimeField(default=datetime.now, blank=True)

class User(AbstractUser):
    # Add any additional fields here if needed
    pass

class Tournament(models.Model):
    name = models.CharField(max_length=255)
    participants = models.ManyToManyField(User, related_name='tournaments')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    def __str__(self):
        return self.name
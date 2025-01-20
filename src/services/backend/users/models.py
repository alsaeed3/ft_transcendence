from django.db import models
from django.contrib.auth.models import User
from datetime import datetime

# Create your models here.

class UserProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE)
	profile_picture = models.ImageField(upload_to='profile_pictures', default='profile_pictures/default.jpg')
	bio = models.TextField(blank=True, null=True)
	language_preference = models.CharField(max_length=20, default='en')
	two_factor_enabled = models.BooleanField(default=False) # For 2FA

	def __str__(self):
		return f'{self.user.username} UserProfile'

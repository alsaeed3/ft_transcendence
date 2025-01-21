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
	nickname = models.CharField(max_length=255, blank=True, null=True)
	email = models.EmailField(blank=True, null=True)
	first_name = models.CharField(max_length=30, blank=True, null=True)
	last_name = models.CharField(max_length=30, blank=True, null=True)
	user_id_42 = models.CharField(max_length=255, blank=True, null=True)
	def __str__(self):
		return f'{self.user.username} UserProfile'
	





	#  login_42 = user_data.get('login')
    # email = user_data.get('email')
    # first_name = user_data.get('first_name')
    # last_name = user_data.get('last_name')
    # user_id_42 = user_data.get('id') 

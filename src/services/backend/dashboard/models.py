from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Dashboard(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE)
	total_matches = models.IntegerField(default=0)
	total_wins = models.IntegerField(default=0)
	total_losses = models.IntegerField(default=0)

	def __str__(self):
		return f'{self.user.username} Dashboard'

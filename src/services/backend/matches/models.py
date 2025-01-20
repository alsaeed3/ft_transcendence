from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Match(models.Model):
	player1 = models.ForeignKey( User, related_name='player1_matches', on_delete=models.CASCADE )
	player2 = models.ForeignKey( User, related_name='player2_matches', on_delete=models.CASCADE )
	player1_score = models.IntegerField()
	player2_score = models.IntegerField()
	timestamp = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f'Match {self.id}: {self.player1.username} vs {self.player2.username}'
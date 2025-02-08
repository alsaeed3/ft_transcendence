from django.db import models
from django.utils import timezone
from users.models import User
from tournaments.models import Tournament

# Create your models here.
class Match(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    player1_name = models.CharField(max_length=150)
    player2_name = models.CharField(max_length=150)
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    winner_name = models.CharField(max_length=150, null=True, blank=True)

    def __str__(self):
        return f'Match {self.id}: {self.player1_name} vs {self.player2_name}'
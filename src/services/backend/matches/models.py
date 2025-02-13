from django.db import models
from django.utils import timezone
from users.models import User
from tournaments.models import Tournament

# Create your models here.
class Match(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    player1_name = models.CharField(max_length=150, db_index=True)
    player2_name = models.CharField(max_length=150, db_index=True)
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()
    start_time = models.DateTimeField(default=timezone.now, db_index=True)
    end_time = models.DateTimeField(null=True, blank=True)
    winner_name = models.CharField(max_length=150, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['-start_time']),
            models.Index(fields=['player1_name', 'player2_name']),
        ]

    def __str__(self):
        return f'Match {self.id}: {self.player1_name} vs {self.player2_name}'
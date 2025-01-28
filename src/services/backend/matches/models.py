from django.db import models
from django.utils import timezone
from users.models import User
from tournaments.models import Tournament

# Create your models here.
class Match(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    player1 = models.ForeignKey(User, related_name='matches_as_player1', on_delete=models.CASCADE)
    player2 = models.ForeignKey(User, related_name='matches_as_player2', on_delete=models.CASCADE)
    player1_score = models.IntegerField()
    player2_score = models.IntegerField()
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    winner = models.ForeignKey(User, related_name='won_matches', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f'Match {self.id}: {self.player1.username} vs {self.player2.username}'
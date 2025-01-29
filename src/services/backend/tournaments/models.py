from django.db import models
from django.core.exceptions import ValidationError
from users.models import User

class Tournament(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed')
    ]
    
    name = models.CharField(max_length=255)
    participants = models.ManyToManyField(User, related_name='tournaments')
    start_time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    current_round = models.IntegerField(default=1)
    winner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tournament_wins')

    def generate_first_round(self):
        players = list(self.participants.all())
        if len(players) < 2:
            raise ValidationError("Need at least 2 players")
        
        # Pair players for first round
        matches = []
        for i in range(0, len(players), 2):
            if i + 1 < len(players):
                TournamentMatch.objects.create(
                    tournament=self,
                    round_number=1,
                    player1=players[i],
                    player2=players[i + 1]
                )

class TournamentMatch(models.Model):
    tournament = models.ForeignKey(Tournament, related_name='matches', on_delete=models.CASCADE)
    round_number = models.IntegerField()
    player1 = models.ForeignKey(User, related_name='+', on_delete=models.CASCADE)
    player2 = models.ForeignKey(User, related_name='+', on_delete=models.CASCADE)
    winner = models.ForeignKey(User, related_name='+', on_delete=models.SET_NULL, null=True, blank=True)
    completed = models.BooleanField(default=False)
    match = models.ForeignKey('matches.Match', on_delete=models.SET_NULL, null=True, blank=True)
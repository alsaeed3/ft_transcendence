from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

class Match(models.Model):
    MATCH_TYPE_CHOICES = [
        ('Pong', 'Pong'),
        ('Tournament', 'Tournament'),
        ('Territory', 'Territory'),
    ]
    
    # Fields used by all match types
    match_type = models.CharField(max_length=150, choices=MATCH_TYPE_CHOICES)
    start_time = models.DateTimeField(default=timezone.now, db_index=True)
    end_time = models.DateTimeField(null=True, blank=True)
    winner_name = models.CharField(max_length=150, db_index=True)
    created_by = models.CharField(max_length=150, db_index=True)

    # Pong-specific fields (optional for other match types)
    player1_name = models.CharField(max_length=150, db_index=True, null=True, blank=True)
    player2_name = models.CharField(max_length=150, db_index=True, null=True, blank=True)
    player1_score = models.IntegerField(null=True, blank=True)
    player2_score = models.IntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['match_type', 'start_time']),
            models.Index(fields=['player1_name', 'player2_name']),
        ]
        ordering = ['-start_time']

    def clean(self):
        if not self.winner_name:
            raise ValidationError('Winner name is required for all match types')
        
        if not self.created_by:
            raise ValidationError('Created by is required for all match types')
        
        if self.match_type == 'Pong':
            if not all([self.player1_name, self.player2_name, 
                       self.player1_score is not None, 
                       self.player2_score is not None]):
                raise ValidationError('Pong matches require both players and scores')
            
            # Validate winner_name for Pong matches
            if self.winner_name not in [self.player1_name, self.player2_name]:
                raise ValidationError('Winner must be one of the players')
            
            # Validate winner matches the scores
            if (self.player1_score > self.player2_score and self.winner_name != self.player1_name) or \
               (self.player2_score > self.player1_score and self.winner_name != self.player2_name) or \
               (self.player1_score == self.player2_score):
                raise ValidationError('Winner does not match the scores')
        else:
            # For Tournament and Territory matches, only validate no player details are included
            if (self.player1_name or self.player2_name or 
                self.player1_score is not None or 
                self.player2_score is not None):
                raise ValidationError('Tournament and Territory matches should not include player details')

    def __str__(self):
        if self.match_type == 'Pong':
            return f"Pong Match: {self.player1_name} vs {self.player2_name}"
        return f"{self.match_type} Match (created by {self.created_by})"
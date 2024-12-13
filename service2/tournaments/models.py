from django.db import models
from django.contrib.postgres.fields import ArrayField

class Tournament(models.Model):

    creator_name = models.CharField(max_length=100)
    winner_nickname = models.CharField(max_length=100)
    participants_names = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list
    )



    def __str__(self):
        return f"Tournament from {self.start_date} to {self.end_date} - Winner: {self.winner_nickname}"


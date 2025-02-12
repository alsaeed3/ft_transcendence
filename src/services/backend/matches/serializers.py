from rest_framework import serializers
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            'id',
            'tournament',
            'player1_name',
            'player2_name',
            'player1_score',
            'player2_score',
            'start_time',
            'end_time',
            'winner_name'
        ]
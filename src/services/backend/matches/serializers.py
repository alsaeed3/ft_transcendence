from rest_framework import serializers
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()

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
            'winner_name',
            'duration'
        ]

    def get_duration(self, obj):
        if obj.end_time and obj.start_time:
            return (obj.end_time - obj.start_time).total_seconds()
        return None
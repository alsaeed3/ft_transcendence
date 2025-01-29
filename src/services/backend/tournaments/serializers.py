from rest_framework import serializers
from .models import Tournament, TournamentMatch

class TournamentMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = TournamentMatch
        fields = ['id', 'round_number', 'player1', 'player2', 'winner', 'completed']

class TournamentSerializer(serializers.ModelSerializer):
    matches = TournamentMatchSerializer(many=True, read_only=True)
    
    class Meta:
        model = Tournament
        fields = ['id', 'name', 'participants', 'start_time', 'status', 'current_round', 'winner', 'matches']

    def create(self, validated_data):
        tournament = super().create(validated_data)
        tournament.generate_first_round()
        return tournament
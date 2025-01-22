from rest_framework import serializers
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
	class Meta:
		model = Match
		fields = ['player1', 'player2', 'player1_score', 'player2_score', 'match_date', 'timestamp']
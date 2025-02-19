from rest_framework import serializers
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()
    created_by = serializers.CharField(read_only=False, required=True)

    class Meta:
        model = Match
        fields = [
            'id',
            'match_type',
            'start_time',
            'end_time',
            'winner_name',
            'created_by',
            'player1_name',
            'player2_name',
            'player1_score',
            'player2_score',
            'duration',
        ]
        extra_kwargs = {
            'player1_name': {'required': False},
            'player2_name': {'required': False},
            'player1_score': {'required': False},
            'player2_score': {'required': False},
            'winner_name': {'required': True},
            'created_by': {'required': True},
        }

    def validate(self, data):
        if not data.get('winner_name'):
            raise serializers.ValidationError("Winner name is required for all match types")
            
        if not data.get('created_by'):
            raise serializers.ValidationError("Created by is required for all match types")

        match_type = data.get('match_type')
        
        if match_type == 'Pong':
            # Validate required fields for Pong matches
            required_fields = ['player1_name', 'player2_name', 
                             'player1_score', 'player2_score']
            if not all(data.get(field) is not None for field in required_fields):
                raise serializers.ValidationError(
                    "Pong matches require player names and scores"
                )
            
            # Validate winner is one of the players
            winner_name = data.get('winner_name')
            player1_name = data.get('player1_name')
            player2_name = data.get('player2_name')
            player1_score = data.get('player1_score')
            player2_score = data.get('player2_score')

            if winner_name not in [player1_name, player2_name]:
                raise serializers.ValidationError(
                    "Winner must be one of the players"
                )

            if (player1_score > player2_score and winner_name != player1_name) or \
               (player2_score > player1_score and winner_name != player2_name) or \
               (player1_score == player2_score):
                raise serializers.ValidationError(
                    "Winner does not match the scores"
                )
        else:
            # For Tournament and Territory matches, ensure player fields are not provided
            player_fields = ['player1_name', 'player2_name', 
                           'player1_score', 'player2_score']
            if any(data.get(field) for field in player_fields):
                raise serializers.ValidationError(
                    f"{match_type} matches should not include player details"
                )

        return data

    def get_duration(self, obj):
        if obj.end_time and obj.start_time:
            return (obj.end_time - obj.start_time).total_seconds()
        return None
from rest_framework import serializers
from .models import Dashboard

class DashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dashboard
        fields = ['total_matches_played', 'total_wins', 'total_losses']
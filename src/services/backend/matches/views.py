from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Match
from .serializers import MatchSerializer

# Create your views here.
class MatchHistory(generics.ListAPIView):
	serializer_class = MatchSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		return Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
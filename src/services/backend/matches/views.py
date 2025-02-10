from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Match
from .serializers import MatchSerializer

# Create your views here.
class MatchListView(generics.ListCreateAPIView):
    queryset = Match.objects.all().order_by('-start_time')
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Set winner_name based on scores
        player1_score = self.request.data.get('player1_score', 0)
        player2_score = self.request.data.get('player2_score', 0)
        winner_name = None
        
        if player1_score > player2_score:
            winner_name = self.request.data.get('player1_name')
        elif player2_score > player1_score:
            winner_name = self.request.data.get('player2_name')

        serializer.save(winner_name=winner_name)

class MatchDetailView(generics.RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]
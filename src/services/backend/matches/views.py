from rest_framework import generics, permissions
from .models import Match
from .serializers import MatchSerializer

# Create your views here.
# class MatchHistory(generics.ListAPIView):
#     serializer_class = MatchSerializer
#     permission_classes = [IsAuthenticated]

#     def get_queryset(self):
#         user = self.request.user
#         return Match.objects.filter(player1=user) | Match.objects.filter(player2=user)
    
class MatchListView(generics.ListCreateAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class MatchDetailView(generics.RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]
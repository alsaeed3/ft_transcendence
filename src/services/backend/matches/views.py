from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Match
from .serializers import MatchSerializer
from django.db.models import Q

# Create your views here.
class MatchListView(generics.ListCreateAPIView):
    queryset = Match.objects.all().order_by('-start_time')
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # Set created_by from the authenticated user
        serializer.save(created_by=self.request.user.username)

    def create(self, request, *args, **kwargs):
        # Add created_by to the request data if not present
        if 'created_by' not in request.data:
            request.data['created_by'] = request.user.username
        return super().create(request, *args, **kwargs)

class MatchDetailView(generics.RetrieveAPIView):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

class MatchHistoryView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_id = self.kwargs.get('user_id')
        # Get the username from the User model
        from users.models import User
        try:
            user = User.objects.get(id=user_id)
            username = user.username
            
            # Get matches where the user was either player1 or player2
            return Match.objects.filter(
                Q(player1_name=username) | Q(player2_name=username) | Q(created_by=username)
            ).order_by('-start_time')
        except User.DoesNotExist:
            return Match.objects.none()

class MatchesByUsernameView(generics.ListAPIView):
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        username = self.kwargs.get('username')
        return Match.objects.filter(created_by=username).order_by('-start_time')
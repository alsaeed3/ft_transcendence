from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Tournament, TournamentMatch
from .serializers import TournamentSerializer, TournamentMatchSerializer

class TournamentListView(generics.ListCreateAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def advance_round(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status == 'COMPLETED':
            return Response({'detail': 'Tournament already completed'}, status=status.HTTP_400_BAD_REQUEST)
        
        current_matches = TournamentMatch.objects.filter(
            tournament=tournament,
            round_number=tournament.current_round,
            completed=False
        )
        
        if current_matches.exists():
            return Response({'detail': 'Current round not completed'}, status=status.HTTP_400_BAD_REQUEST)
            
        tournament.current_round += 1
        tournament.save()
        return Response({'detail': 'Advanced to next round'})

class TournamentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def start_tournament(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'PENDING':
            return Response(
                {'detail': 'Tournament already started'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        tournament.status = 'ONGOING'
        tournament.save()
        tournament.generate_first_round()
        return Response({'detail': 'Tournament started'})

    @action(detail=True, methods=['post'])
    def record_match_result(self, request, pk=None):
        tournament = self.get_object()
        match_id = request.data.get('match_id')
        winner_id = request.data.get('winner_id')
        
        try:
            match = TournamentMatch.objects.get(id=match_id, tournament=tournament)
            winner = match.player1 if match.player1.id == winner_id else match.player2
            match.winner = winner
            match.completed = True
            match.save()
            return Response({'detail': 'Match result recorded'})
        except TournamentMatch.DoesNotExist:
            return Response(
                {'detail': 'Match not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def advance_round(self, request, pk=None):
        tournament = self.get_object()
        if tournament.status != 'ONGOING':
            return Response(
                {'detail': 'Tournament not in progress'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if current round is complete
        current_matches = tournament.matches.filter(
            round_number=tournament.current_round,
            completed=False
        )
        if current_matches.exists():
            return Response(
                {'detail': 'Current round not completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get winners from current round
        winners = tournament.matches.filter(
            round_number=tournament.current_round,
            completed=True
        ).values_list('winner', flat=True)

        # If only one winner, tournament is complete
        if len(winners) == 1:
            tournament.status = 'COMPLETED'
            tournament.winner = winners[0]
            tournament.save()
            return Response({'detail': 'Tournament completed'})

        # Create next round matches
        for i in range(0, len(winners), 2):
            if i + 1 < len(winners):
                TournamentMatch.objects.create(
                    tournament=tournament,
                    round_number=tournament.current_round + 1,
                    player1_id=winners[i],
                    player2_id=winners[i + 1]
                )

        tournament.current_round += 1
        tournament.save()
        return Response({'detail': 'Advanced to next round'})

    @action(detail=True, methods=['get'])
    def bracket(self, request, pk=None):
        tournament = self.get_object()
        matches = tournament.matches.all().order_by('round_number')
        serializer = TournamentMatchSerializer(matches, many=True)
        return Response(serializer.data)
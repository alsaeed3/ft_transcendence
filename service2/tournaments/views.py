from rest_framework import viewsets
from .models import Tournament
from .serializers import TournamentSerializer
from rest_framework.views import APIView
from rest_framework.response import Response


class TournamentViewSet(APIView):
    def get(self, request):
        tournaments = Tournament.objects.all()
        serializer = TournamentSerializer(tournaments, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TournamentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    

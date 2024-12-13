from django.urls import path, include
from .views import TournamentViewSet


urlpatterns = [
    path('tournaments/', TournamentViewSet.as_view(), name='tournament-list'),
]

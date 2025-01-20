from django.urls import path
from . import views

urlpatterns = [
	path('api/matches/', views.MatchHistory.as_view(), name='match-history'),
]
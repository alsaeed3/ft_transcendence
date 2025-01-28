from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

urlpatterns = [
	path('tournaments/', views.TournamentListView.as_view(), name='tournament-list'),
    path('tournaments/<int:pk>/', views.TournamentDetailView.as_view(), name='tournament-detail'),
]
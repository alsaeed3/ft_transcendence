from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views


urlpatterns = [
	path('match/', views.MatchListView.as_view(), name='match-list'),
    path('match/<int:pk>/', views.MatchDetailView.as_view(), name='match-detail'),
]
from django.urls import path
from . import views

urlpatterns = [
	path('', views.TournamentListView.as_view(), name='tournament-list'),
    path('<int:pk>/', views.TournamentDetailView.as_view(), name='tournament-detail'),
]
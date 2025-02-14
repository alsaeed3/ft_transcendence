from django.urls import path
from . import views

urlpatterns = [
	path('', views.MatchListView.as_view(), name='match-list'),
    path('<int:pk>/', views.MatchDetailView.as_view(), name='match-detail'),
    path('history/<int:user_id>/', views.MatchHistoryView.as_view(), name='match-history'),
]
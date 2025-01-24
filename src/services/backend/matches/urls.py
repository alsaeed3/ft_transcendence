from django.urls import path
from . import views

urlpatterns = [
	path('', views.MatchHistory.as_view(), name='match-history'),
]
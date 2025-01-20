from django.contrib import admin
from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter
from .views import TournamentViewSet

router = DefaultRouter()
router.register(r'tournaments', TournamentViewSet)

urlpatterns = [
	path('data/', views.get_data, name='get_data'),
    path('oauth/login/', views.ft_oauth_login, name='oauth_login'),
    path('oauth/callback/', views.ft_oauth_callback, name='oauth_login'),
	path('api/profile/', views.ProfileDetail.as_view(), name='profile-detail'),
]
from django.urls import path, include
from . import views

urlpatterns = [
	path('register/', views.UserRegistrationView.as_view(), name='user-register'),
	path('oauth/login/', views.ft_oauth_login, name='oauth_login'),
	path('oauth/callback/', views.ft_oauth_callback, name='oauth_callback'),
	path('profile/', views.ProfileDetail.as_view(), name='profile-detail'),
]
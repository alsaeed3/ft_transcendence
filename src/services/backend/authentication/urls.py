from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, LogoutView

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('oauth/login/', views.ft_oauth_login, name='oauth_login'),
    path('oauth/callback/', views.ft_oauth_callback, name='oauth_callback'),
    path('2fa/verify/', views.TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/toggle/', views.TwoFactorToggleView.as_view(), name='2fa-toggle'),
    path('token/refresh/', views.TokenRefreshView.as_view(), name='token_refresh'),
]
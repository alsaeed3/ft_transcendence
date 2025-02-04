from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.UserRegistrationView.as_view(), name='user-register'),
    path('login/', views.TwoFactorLoginView.as_view(), name='login'),
    path('logout/', views.UserLogoutView.as_view(), name='logout'),
    path('oauth/login/', views.ft_oauth_login, name='oauth_login'),
    path('oauth/callback/', views.ft_oauth_callback, name='oauth_callback'),
    path('2fa/verify/', views.TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('2fa/toggle/', views.TwoFactorToggleView.as_view(), name='2fa-toggle'),
]
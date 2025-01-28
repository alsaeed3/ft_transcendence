from django.urls import path
from . import views

urlpatterns = [
	path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
	path('register/', views.UserRegistrationView.as_view(), name='user-register'),
	path('login/', views.UserLoginView.as_view(), name='login'),
	path('logout/', views.UserLogoutView.as_view(), name='logout'),
	path('oauth/login/', views.ft_oauth_login, name='oauth_login'),
	path('oauth/callback/', views.ft_oauth_callback, name='oauth_callback')
]
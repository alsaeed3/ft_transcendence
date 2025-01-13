from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
	path('', views.home, name='home'),
	path('register', views.register, name='register'),
	path('login', views.login, name='login'),
	path('logout', views.logout, name='logout'),
	path('dashboard', views.dashboard, name='dashboard'),
	path('pong', views.pong, name='pong'),
]
from django.urls import path
from . import views

urlpatterns = [
	path('', views.FriendList.as_view(), name='friend-list'),
]
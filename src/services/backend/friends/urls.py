from django.urls import path
from . import views

urlpatterns = [
	path('api/friends/', views.FriendList.as_view(), name='friend-list'),
]
from django.urls import path
from . import views

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('profile/', views.ProfileDetail.as_view(), name='profile-detail'),
    path('friends/', views.FriendListView.as_view(), name='friend-list'),
    path('<int:pk>/friend-request/', views.FriendRequestView.as_view(), name='friend-request'),
    path('<int:pk>/unfriend/', views.UnfriendView.as_view(), name='unfriend'),
]
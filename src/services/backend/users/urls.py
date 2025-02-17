from django.urls import path
from . import views
from .views import UserMeView

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('profile/', views.ProfileDetail.as_view(), name='profile-detail'),
    path('friends/', views.FriendListView.as_view(), name='friend-list'),
    path('<int:pk>/friend-request/', views.FriendRequestView.as_view(), name='friend-request'),
    path('<int:pk>/unfriend/', views.UnfriendView.as_view(), name='unfriend'),
    path('block/<int:user_id>/', views.BlockUserView.as_view(), name='block-user'),
    path('unblock/<int:user_id>/', views.UnblockUserView.as_view(), name='unblock-user'),
    path('me/', UserMeView.as_view(), name='user-me'),
    path('logout/', views.UserLogoutView.as_view(), name='user-logout'),
    path('messages/<int:user_id>/', views.get_chat_messages, name='chat_messages'),
    path('messages/send/', views.send_message, name='send_message'),
    path('messages/<int:other_user_id>/read/', views.mark_messages_read, name='mark-messages-read'),
    path('profile/<int:user_id>/', views.UserProfileView.as_view(), name='user-profile'),
    path('profile/stats/', views.UpdateUserStatsView.as_view(), name='update-user-stats'),
]
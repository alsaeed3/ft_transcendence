from django.urls import path
from . import views

urlpatterns = [
    path('', views.UserListView.as_view(), name='user-list'),
    path('<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('profile/', views.ProfileDetail.as_view(), name='profile-detail'),
    path('block/<int:user_id>/', views.BlockUserView.as_view(), name='block-user'),
    path('me/', views.CurrentUserView.as_view(), name='current-user'),
    # Maintain logout endpoint if needed
    path('logout/', views.UserLogoutView.as_view(), name='user-logout'),
	path('messages/<int:other_user_id>/', views.get_chat_messages, name='chat-messages'),
	path('messages/<int:other_user_id>/read/', views.mark_messages_read, name='mark-messages-read'),
]
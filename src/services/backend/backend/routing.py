from django.urls import re_path
from users.consumers import PrivateChatConsumer, UserStatusConsumer

websocket_urlpatterns = [
    re_path(r'^ws/status/$', UserStatusConsumer.as_asgi()),
    re_path(r'^ws/chat/(?P<user1_id>\d+)/(?P<user2_id>\d+)/$', PrivateChatConsumer.as_asgi()),
]
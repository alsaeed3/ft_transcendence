from django.urls import re_path
from users.consumers import PrivateChatConsumer

websocket_urlpatterns = [
    re_path(r'ws/chat/$', PrivateChatConsumer.as_asgi()),
]
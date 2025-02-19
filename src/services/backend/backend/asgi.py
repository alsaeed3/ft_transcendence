"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Import Django and setup first
import django
django.setup()

# Import the rest after Django is setup
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path
from users.consumers import StatusConsumer, UserStatusConsumer, PrivateChatConsumer
from authentication.middleware import JWTAuthMiddleware

# Initialize Django ASGI application early
django_asgi_app = get_asgi_application()

# Define WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/status/', StatusConsumer.as_asgi()),
    path('ws/chat/<str:user1_id>/<str:user2_id>/', PrivateChatConsumer.as_asgi()),
    path('ws/user_status/', UserStatusConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
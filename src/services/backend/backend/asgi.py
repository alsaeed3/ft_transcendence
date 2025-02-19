"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Import Django first and setup
import django
django.setup()

# Import the rest after Django is setup
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from channels.auth import AuthMiddlewareStack
from users.middleware import TokenAuthMiddleware
from .routing import websocket_urlpatterns

# Initialize Django ASGI application early to ensure proper initialization
django_asgi_app = get_asgi_application()

# Create a custom middleware stack with additional security
def create_middleware_stack(inner):
    return TokenAuthMiddleware(
        AuthMiddlewareStack(
            inner
        )
    )

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        create_middleware_stack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
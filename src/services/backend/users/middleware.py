from django.contrib.auth.models import AnonymousUser
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from django.contrib.auth import get_user_model

User = get_user_model()

def get_user_from_cookie(scope):
    try:
        # Get the cookie header from scope
        headers = dict(scope['headers'])
        cookie_header = headers.get(b'cookie', b'').decode()
        
        # Parse cookies
        cookies = {}
        if cookie_header:
            for cookie in cookie_header.split(';'):
                if '=' in cookie:
                    name, value = cookie.strip().split('=', 1)
                    cookies[name] = value

        # Get access token from cookie
        access_token = cookies.get(settings.JWT_AUTH_COOKIE)
        
        if not access_token:
            return AnonymousUser()

        # Validate token and get user
        token = AccessToken(access_token)
        user_id = token.payload.get('user_id')
        
        if user_id:
            user = User.objects.get(id=user_id)
            return user
            
    except (InvalidToken, TokenError, User.DoesNotExist):
        pass
    
    return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Get user from cookie
        scope['user'] = await self.get_user(scope)
        return await super().__call__(scope, receive, send)

    async def get_user(self, scope):
        from channels.db import database_sync_to_async
        get_user = database_sync_to_async(get_user_from_cookie)
        return await get_user(scope)

def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(AuthMiddlewareStack(inner))
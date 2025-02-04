from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    def __init__(self, inner):
        super().__init__(inner)

    async def __call__(self, scope, receive, send):
        # Get the query string from the scope and parse it
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token', [None])[0]

        # Initialize an anonymous user
        scope['user'] = None

        if token:
            try:
                # Verify the token and get the user
                access_token = AccessToken(token)
                user = await self.get_user(access_token['user_id'])
                scope['user'] = user
            except (InvalidToken, TokenError, User.DoesNotExist):
                pass

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, user_id):
        return User.objects.get(id=user_id)
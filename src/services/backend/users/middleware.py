from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
import logging

logger = logging.getLogger(__name__)

class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            # Parse query string properly
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            token = query_params.get('token', [None])[0]
            
            logger.debug(f"Processing token: {token}")
            
            if token:
                try:
                    access_token = AccessToken(token)
                    user_id = access_token.payload.get('user_id')
                    scope['user'] = await self.get_user(user_id)
                    logger.info(f"Authenticated user {user_id}")
                except Exception as e:
                    logger.error(f"Token validation failed: {str(e)}")
                    scope['user'] = AnonymousUser()
            else:
                logger.warning("No token provided")
                scope['user'] = AnonymousUser()
                
            return await super().__call__(scope, receive, send)
            
        except Exception as e:
            logger.error(f"Middleware error: {str(e)}")
            scope['user'] = AnonymousUser()
            return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()
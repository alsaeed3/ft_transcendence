from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.conf import settings
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(user_id):
    User = get_user_model()
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        try:
            # Get the cookies from the scope
            headers = dict(scope.get('headers', []))
            cookie_header = headers.get(b'cookie', b'').decode()
            
            # Parse cookies into a dictionary
            cookie_dict = {}
            if cookie_header:
                cookie_dict = {
                    cookie.split('=')[0].strip(): cookie.split('=')[1].strip()
                    for cookie in cookie_header.split(';')
                    if '=' in cookie
                }

            # Get the token from cookies
            token = cookie_dict.get(settings.SIMPLE_JWT['AUTH_COOKIE'])
            
            if token:
                # Validate and decode the token
                UntypedToken(token)
                decoded_data = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user = await get_user(decoded_data['user_id'])
                if user:
                    scope['user'] = user
                    logger.debug(f"Successfully authenticated user {user.id} for WebSocket connection")
                else:
                    logger.warning(f"User not found for token payload: {decoded_data}")
            else:
                logger.debug("No token found in cookies")
                
        except (InvalidToken, TokenError) as e:
            logger.warning(f"Invalid token: {e}")
        except Exception as e:
            logger.error(f"Error in JWTAuthMiddleware: {e}", exc_info=True)

        return await super().__call__(scope, receive, send) 
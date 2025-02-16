from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # Try to get the token from the cookie first
        access_token = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE'])
        
        if not access_token:
            # If no cookie, try header authentication
            return super().authenticate(request)

        validated_token = self.get_validated_token(access_token)
        return self.get_user(validated_token), validated_token 
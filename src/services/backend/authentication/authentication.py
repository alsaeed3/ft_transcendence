from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # First try to get the token from cookies
        access_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        
        if not access_token:
            # Fall back to Authorization header
            header = self.get_header(request)
            if header is None:
                return None
                
            access_token = self.get_raw_token(header)
            if not access_token:
                return None

        try:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            return user, validated_token
        except Exception:
            return None

    def authenticate_header(self, request):
        return 'Bearer' 
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from django.contrib.auth import authenticate, get_user_model
from django.http import HttpResponse, JsonResponse
from users.models import User
from .serializers import AuthUserSerializer, UserRegistrationSerializer, TwoFactorToggleSerializer, TwoFactorVerifySerializer
from django.core.exceptions import ObjectDoesNotExist
from urllib.parse import urlencode
from django.shortcuts import redirect
import requests
import os
from django.core.mail import send_mail # 2FA
from django.db import IntegrityError
from django.conf import settings
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView, TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny

User = get_user_model()

class UserRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            # FIXED: Create single user with all fields
            user = User.objects.create_user(
                username=serializer.validated_data['username'],
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password'],
                display_name=serializer.validated_data['username'],
                language_preference='en'
            )
            return Response(
                AuthUserSerializer(user).data, 
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            response = Response({'message': 'Logged out successfully'})
            response.delete_cookie('access_token')
            response.delete_cookie('refresh_token')
            return response
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


# /////////////////// 42FA ////////////////////////////


class TwoFactorLoginView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(username=username)
            if user.is_42_auth:
                return Response({'error': 'Use 42 OAuth login'}, status=400)

            authenticated_user = authenticate(username=username, password=password)
            if not authenticated_user:
                return Response({'error': 'Invalid credentials'}, status=401)

            if user.is_2fa_enabled:
                otp = user.generate_otp()
                subject = 'Your Security Code'
                message = f'OTP: {otp}'
                try:
                    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
                except Exception as e:
                    return Response({'error': 'Failed to send OTP'}, status=500)
                return Response({
                    '2fa_required': True,
                    'user': AuthUserSerializer(user).data
                }, status=202)

            # Generate tokens and set cookies
            refresh = RefreshToken.for_user(user)
            response = Response({
                'message': 'Login successful',
                'user': AuthUserSerializer(user).data
            })

            response.set_cookie(
                settings.SIMPLE_JWT['AUTH_COOKIE'],
                str(refresh.access_token),
                httponly=True,
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                max_age=60 * 60,
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN']
            )
            
            response.set_cookie(
                settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
                str(refresh),
                httponly=True,
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                max_age=60 * 60 * 24 * 7,
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                domain=settings.SIMPLE_JWT['AUTH_COOKIE_DOMAIN']
            )
            
            return response

        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=401)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class TwoFactorVerifyView(APIView):
    """Verify 2FA OTP"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = User.objects.get(email=request.data['email'])
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        if user.is_otp_valid(serializer.validated_data['otp']):
            refresh = RefreshToken.for_user(user)
            response = Response({
                'message': 'Verification successful',
                'user': AuthUserSerializer(user).data
            })
            
            response.set_cookie(
                'access_token',
                str(refresh.access_token),
                httponly=True,
                secure=True,
                samesite='Lax',
                max_age=60 * 60,
                path='/'
            )
            
            response.set_cookie(
                'refresh_token',
                str(refresh),
                httponly=True,
                secure=True,
                samesite='Lax',
                max_age=60 * 60 * 24 * 7,
                path='/'
            )
            
            return response
            
        return Response({'error': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)



class TwoFactorToggleView(APIView):
    """Enable/disable 2FA (requires authentication)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        if not user.check_password(serializer.validated_data['password']):
            return Response({'error': 'Invalid password'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user.is_2fa_enabled = not user.is_2fa_enabled
        user.save()
        return Response({
            'status': '2FA enabled' if user.is_2fa_enabled else '2FA disabled'
        })





# /////////////////// 42 auth //////////////////////////
@api_view(['GET'])
def ft_oauth_login(request):
    baseurl = 'https://api.intra.42.fr/oauth/authorize'
    parameters = {
        'client_id': os.getenv('FT_CLIENT_ID'),
        'response_type': 'code',
        'redirect_uri': os.getenv('FT_REDIRECT_URI'),
    }
    url =  f"{baseurl}?{urlencode(parameters)}"
    return redirect(url)

@api_view(['GET'])
def ft_oauth_callback(request):
    # Check for error parameter first
    error = request.GET.get('error')
    if error:
        frontend_url = "https://localhost"
        return redirect(f"{frontend_url}/?auth_error={request.GET.get('error_description', 'Authorization was denied')}")

    code = request.GET.get('code')
    if not code:
        frontend_url = "https://localhost"
        return redirect(f"{frontend_url}/?auth_error=Authorization failed")

    try:
        token_url = 'https://api.intra.42.fr/oauth/token'
        token_data = {
            'grant_type': 'authorization_code',
            'client_id': os.getenv('FT_CLIENT_ID'),
            'client_secret': os.getenv('FT_CLIENT_SECRET'),
            'code': code,
            'redirect_uri': os.getenv('FT_REDIRECT_URI'),
        }
        
        # The timeout is currently set to 5 seconds
        token_response = requests.post(token_url, data=token_data, timeout=5)
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            frontend_url = "https://localhost"
            return redirect(f"{frontend_url}/?auth_error=Failed to obtain access token")

        # Get user info from 42 API
        user_info_url = 'https://api.intra.42.fr/v2/me'
        headers = {'Authorization': f'Bearer {access_token}'}
        user_info_response = requests.get(user_info_url, headers=headers, timeout=5)
        user_info_response.raise_for_status()
        user_data = user_info_response.json()

        # Extract user info
        first_name = user_data.get('first_name')
        last_name = user_data.get('last_name')
        user_id_42 = user_data.get('id')
        login_42 = user_data.get('login')
        email = user_data.get('email')
        
        if not all([user_id_42, login_42, email]):
            frontend_url = "https://localhost"
            return redirect(f"{frontend_url}/?auth_error=Incomplete user data from 42 API")

        # Get or create user
        try:
            user = User.objects.get(user_id_42=user_id_42)
        except User.DoesNotExist:
            username = login_42
            if User.objects.filter(username=username).exists():
                frontend_url = "https://localhost"
                return redirect(f"{frontend_url}/?auth_error=Username already exists")

            user = User.objects.create(
                first_name=first_name,
                last_name=last_name,
                user_id_42=user_id_42,
                username=username,
                email=email,
                display_name=login_42,
                is_42_auth=True,
                login_42=login_42
            )
            user.set_unusable_password()
            user.save()

        # Generate tokens and set cookies
        refresh = RefreshToken.for_user(user)
        frontend_url = "https://localhost"
        response = redirect(frontend_url)
        
        # Set cookies
        response.set_cookie(
            'access_token',
            str(refresh.access_token),
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=60 * 60,  # 1 hour
            path='/'
        )
        
        response.set_cookie(
            'refresh_token',
            str(refresh),
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=60 * 60 * 24 * 7,  # 7 days
            path='/'
        )
        
        return response

    except Exception as e:
        frontend_url = "https://localhost"
        return redirect(f"{frontend_url}/?auth_error=Authentication failed")

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Please provide both username and password.'}, 
                status=400
            )

        user = authenticate(username=username, password=password)

        if not user:
            return Response(
                {'detail': 'Invalid credentials.'}, 
                status=401
            )

        # Create tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Create response with user data
        response = Response({
            'user': AuthUserSerializer(user).data,
            'detail': 'Login successful'
        })

        # Set secure cookies
        response.set_cookie(
            settings.JWT_AUTH_COOKIE,
            access_token,
            max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
            httponly=True,
            samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
            secure=settings.JWT_AUTH_COOKIE_SECURE,
            path=settings.JWT_AUTH_COOKIE_PATH,
            domain=settings.JWT_AUTH_COOKIE_DOMAIN
        )
        
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh_token,
            max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
            httponly=True,
            samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
            secure=settings.JWT_AUTH_COOKIE_SECURE,
            path=settings.JWT_AUTH_COOKIE_PATH,
            domain=settings.JWT_AUTH_COOKIE_DOMAIN
        )

        return response

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            response = Response({'message': 'Logged out successfully'})
            
            # Delete JWT cookies
            response.delete_cookie(settings.JWT_AUTH_COOKIE)
            response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE)
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class TokenRefreshView(BaseTokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
        if not refresh_token:
            return Response({'error': 'No refresh token cookie'}, status=401)
            
        # Create a mutable copy of the request data
        request.data._mutable = True
        request.data['refresh'] = refresh_token
        
        try:
            response = super().post(request, *args, **kwargs)
            
            if response.status_code == 200:
                response.set_cookie(
                    settings.JWT_AUTH_COOKIE,
                    response.data['access'],
                    max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                    httponly=True,
                    samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
                    secure=settings.JWT_AUTH_COOKIE_SECURE,
                    path=settings.JWT_AUTH_COOKIE_PATH,
                    domain=settings.JWT_AUTH_COOKIE_DOMAIN
                )
                
                # Remove tokens from response body
                response.data = {'message': 'Token refresh successful'}
            
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = AuthUserSerializer(request.user)
        return Response(serializer.data)

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            # Get the tokens from the response data
            access_token = response.data['access']
            refresh_token = response.data['refresh']
            
            # Set the cookies
            response.set_cookie(
                settings.JWT_AUTH_COOKIE,
                access_token,
                max_age=settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
                secure=settings.JWT_AUTH_COOKIE_SECURE
            )
            
            response.set_cookie(
                settings.JWT_AUTH_REFRESH_COOKIE,
                refresh_token,
                max_age=settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds(),
                httponly=True,
                samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
                secure=settings.JWT_AUTH_COOKIE_SECURE
            )
            
        return response
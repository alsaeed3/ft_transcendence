import re, os, pyotp, io, qrcode, base64, requests, jwt
from django.conf import settings
from .serializers import LoginSerializer, AccountSerializer, Verify2FASerializer, TournamentSerializer
from .models import Account
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenVerifyView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django.contrib.auth import get_user_model
from django.shortcuts import redirect
from django.views.generic import RedirectView
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from urllib.parse import urlencode
from jwt.exceptions import ExpiredSignatureError, DecodeError


class RegisterView(generics.CreateAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_201_CREATED)

Account = get_user_model()

class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            result = serializer.validate(request.data)

            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({"message": [e.detail[0]]}, status=status.HTTP_400_BAD_REQUEST)
        
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data["refresh"]
        if not refresh_token:
            return Response({"error": ["Refresh token is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
                # Blacklist the refresh token
            refresh = RefreshToken(refresh_token)
            refresh.blacklist()
        except Exception as e:
                return Response(
                    {"detail": "Refresh token is invalid or expired. Please log in again."},
                    status=status.HTTP_401_UNAUTHORIZED)

        return Response({"message": ["Successfully logged out."]}, status=status.HTTP_205_RESET_CONTENT)


class Enable2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('id')
        username = request.data.get('username')
        email = request.data.get('email')
        if not (user_id or username or email):
            return Response(
                {"message": ["Please provide at least one of the following: 'id', 'username', or 'email'."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = Account.objects.get(
                Q(id=user_id) | Q(username=username) | Q(email=email)
            )
        except ObjectDoesNotExist:
            return Response({"message": ["User not found in the database!"]}, status=status.HTTP_400_BAD_REQUEST)

        intra_login = user.login_intra
        if (intra_login):
            return Response(
                {"message": ["User was created using intra 42 API and not eligible to enable 2FA!"]},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user.is_2fa_enabled:
            return Response({"message": ["2FA is already enabled."]}, status=status.HTTP_400_BAD_REQUEST)

        # Generate a new secret key if not already set
        if not user.otp_secret:
            user.otp_secret = pyotp.random_base32()
            user.save()

        # Generate the provisioning URI
        totp = pyotp.TOTP(user.otp_secret)
        otp_auth_url = totp.provisioning_uri(name=user.username, issuer_name="ft_transcendence")

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(otp_auth_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            "qr_code": img_str,
        }, status=status.HTTP_200_OK)
    
class Verify2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('id')
        username = request.data.get('username')
        email = request.data.get('email')
        if not (user_id or username or email):
            return Response(
                {"message": ["Please provide at least one of the following: 'id', 'username', or 'email'."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = Account.objects.get(
                Q(id=user_id) | Q(username=username) | Q(email=email)
            )
        except ObjectDoesNotExist:
            return Response({"message": ["User not found in the database!"]}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = Verify2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp_token = serializer.validated_data['otp_token']

        totp = pyotp.TOTP(user.otp_secret)
        if totp.verify(otp_token):
            user.is_2fa_enabled = True
            user.save()
            return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_2fa_enabled": user.is_2fa_enabled,
            }}, status=status.HTTP_200_OK)
        else:
            return Response({"message": ["Invalid OTP token."]}, status=status.HTTP_400_BAD_REQUEST)
        
class Disable2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get('id')
        username = request.data.get('username')
        email = request.data.get('email')
        if not (user_id or username or email):
            return Response(
                {"message": ["Please provide at least one of the following: 'id', 'username', or 'email'."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            user = Account.objects.get(
                Q(id=user_id) | Q(username=username) | Q(email=email)
            )
        except ObjectDoesNotExist:
            return Response({"message": ["User not found in the database!"]}, status=status.HTTP_400_BAD_REQUEST)
        intra_login = user.login_intra
        if (intra_login):
            return Response(
                {"message": ["User was created using intra 42 API and not eligible to enable 2FA!"]},
                status=status.HTTP_400_BAD_REQUEST
            )
        if (user.is_2fa_enabled == False):
            return Response(
                {"message": ["2FA for the user is already disabled!"]},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_2fa_enabled = False
        user.otp_secret = pyotp.random_base32()
        user.save()
        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_2fa_enabled": user.is_2fa_enabled,
            }}, status=status.HTTP_200_OK)
    

class CustomTokenVerifyView(TokenVerifyView):
    def post(self, request, *args, **kwargs):
        token = request.data.get("access")
        refresh_token = request.data["refresh"]
        if not token:
            return Response({"error": ["Access token is required."]}, status=status.HTTP_400_BAD_REQUEST)
        if not refresh_token:
            return Response({"error": ["Refresh token is required."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Decode the token without verification to check if it's malformed
            jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])

            # Attempt to validate the token (this will check signature and expiration)
            UntypedToken(token)

            # Token is valid
            return Response({"detail": "Token is valid."}, status=status.HTTP_200_OK)
        except (ExpiredSignatureError):
            # Token has expired (for some reason if the token expired DRF raise antoher error)
            return Response(
                {"message": ["Token is expired."]},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except (InvalidToken):
            return Response(
                {"message": ["Error"]},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except (DecodeError):
            try:
                # Blacklist the refresh token
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()
            except TokenError:
                return Response(
                    {"detail": "Refresh token is invalid or expired. Please log in again."},
                    status=status.HTTP_401_UNAUTHORIZED)
            return Response(
                {"message": ["Token is invalid. Refresh token is blacklisted. User need to login again"]},
                status=status.HTTP_401_UNAUTHORIZED)
        except (TokenError):
            return Response(
                {"message": ["Token is expired"]},
                status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            # Other errors
            return Response(
                {"message": ["An error has occurred."],
                    "error_type": [type(e).__name__],
                    "error_message": [str(e)],
                },status=status.HTTP_400_BAD_REQUEST)


#############################42 auth##################################


CLIENT_ID = os.environ.get('CLIENT_ID')
CLIENT_SECRET = os.environ.get('CLIENT_SECRET')
REDIRECT_URI = os.environ.get('REDIRECT_URI')

class RedirectTo42View(RedirectView):
    def get_redirect_url(self, *args, **kwargs):
        return f'https://api.intra.42.fr/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code'

class Handle42AuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def find_or_create_intra_user(self, user_info):
        User = get_user_model()
        
        # If the user already exists, return the user
        if User.objects.filter(login_intra=user_info['login']).exists():
            return User.objects.get(login_intra=user_info['login'])
        
        # Create the user if it doesn't exist
        username_base = user_info['login']
        username = username_base
        attempts = 0

        while User.objects.filter(username=username).exists():
            attempts += 1
            username = f'{username_base}{str(attempts)}'

        user = User.objects.create_user(
            username=username,
            email=user_info['email'],
            login_intra=user_info['login'],
            password=user_info['login'],
            first_name=user_info['first_name'],
            last_name=user_info['last_name'],
        )
        user.save()
        return user
    
    def get(self, request, *args, **kwargs):
        code = request.query_params.get('code')

        if code is None:
            redirect_url = f'/#42ad?error=Authentication failed. Please try again.'
            return redirect(redirect_url)

        response = requests.post(
            f'https://api.intra.42.fr/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET,
                'redirect_uri': REDIRECT_URI,
                'code': code
            }
        )

        if response.status_code != 200:
            return Response({"message": ["Authentication failed"]}, status=400)

        authorizations = response.json()
        access_token = authorizations['access_token']
        user_response = requests.get(
            'https://api.intra.42.fr/v2/me',
            headers={
                'Authorization': f'Bearer {access_token}'
            }
        )

        if user_response.status_code != 200:
            return Response({"message": ["Failed to retrieve user info"]}, status=400)

        user_info = user_response.json()
        user = self.find_or_create_intra_user(user_info)

        refresh = RefreshToken.for_user(user)
        params = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "intra_login": user.login_intra,
        }

        query_string = urlencode(params)

        redirect_url = f'/#42ad?{query_string}'

        return redirect(redirect_url)
    
#############################Tournament handle##################################

class TournamentProxyView(APIView):
    permission_classes = [IsAuthenticated]

    def _proxy_request(self, method, url, headers, data=None, params=None):
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=10
            )
            response.raise_for_status()
            return Response(response.json(), status=response.status_code)
        except requests.HTTPError as http_err:
            return Response(response.json(), status=response.status_code)
        except requests.RequestException as e:
            return Response({"error": ["Tournament Service unavailable."]}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def post(self, request):
        serializer = TournamentSerializer(data=request.data)
        if serializer.is_valid():
            tournament_data = request.data
            tournament_service_url = os.environ.get('TOURNAMENT_SERVICE_URL') + '/api/tournaments/'
            headers = {
                'Content-Type': 'application/json',
            } 
            return self._proxy_request('POST', tournament_service_url, headers, data=tournament_data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, tournament_id=None):
        tournament_service_url = os.environ.get('TOURNAMENT_SERVICE_URL') + '/api/tournaments/'
        if tournament_id:
            tournament_service_url += f"{tournament_id}/"
        headers = {
            'Content-Type': 'application/json',
        }
        params = request.query_params.dict()
        return self._proxy_request('GET', tournament_service_url, headers, params=params)

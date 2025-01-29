from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from django.contrib.auth import authenticate
from django.http import HttpResponse, JsonResponse
from users.models import User
from .serializers import AuthUserSerializer, UserRegistrationSerializer
from django.core.exceptions import ObjectDoesNotExist
from urllib.parse import urlencode
from django.shortcuts import redirect
import requests
import os

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

class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': AuthUserSerializer(user).data
            })
        return Response(
            {'error': 'Invalid Credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserLogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


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
    code = request.GET.get('code')
    # Exchange code for access token
    token_url = 'https://api.intra.42.fr/oauth/token/'
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': os.getenv('FT_CLIENT_ID'),
        'client_secret': os.getenv('FT_CLIENT_SECRET'),
        'code': code,
        'redirect_uri': 'https://localhost:443/api/auth/oauth/callback/', #
    }
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        return HttpResponse('Failed to obtain access token', status=400)
    token_response = token_response.json()
    access_token = token_response.get('access_token')
    if not access_token:
        return HttpResponse('Failed to obtain access token', status=400)
    

    # Get user info from 42 API
    user_info_url = 'https://api.intra.42.fr/v2/me'
    headers = {'Authorization': f'Bearer {access_token}'}
    user_info_response = requests.get(user_info_url, headers=headers)
    if user_info_response.status_code != 200:
        return Response({'error': 'Failed to get user info'}, status=status.HTTP_400_BAD_REQUEST)

    user_data = user_info_response.json()
    login_42 = user_data.get('login')
    email = user_data.get('email')
    first_name = user_data.get('first_name')
    last_name = user_data.get('last_name')
    user_id_42 = user_data.get('id') 
    is_42_auth = True

    if not all([login_42, email, first_name, last_name, user_id_42]):
        return HttpResponse('Error: Missing user data', status=400)

    try:
        # Check if the user exists
        user = User.objects.get(user_id_42=user_id_42)
        # user = profile.user
    except ObjectDoesNotExist:
    # Create a new user
        username = login_42
        if User.objects.filter(username=username).exists():
            username = f"{username}_42"
        if User.objects.filter(email=email).exists(): # i can delete this if i will not alow any registration comes from outside 42 api
            return HttpResponse('Error: Email already exists', status=400)

        user = User.objects.create(
            user_id_42=user_id_42,
            username=username,
            email=email,
            display_name=login_42,
            is_42_auth=is_42_auth,
            login_42=login_42
        )
        user.set_unusable_password()
        user.save()

    refresh = RefreshToken.for_user(user)
    return Response({
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': AuthUserSerializer(user).data
    }, status=status.HTTP_200_OK)

    # return JsonResponse(AuthUserSerializer(user).data, status=200)


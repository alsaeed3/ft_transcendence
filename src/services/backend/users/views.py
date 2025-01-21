from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core import serializers
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.response import Response
from django.conf import settings
from urllib.parse import urlencode
from .models import UserProfile
from .serializers import ProfileSerializer
import requests
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

class ProfileDetail(generics.RetrieveUpdateAPIView):
	queryset = UserProfile.objects.all()
	serializer_class = ProfileSerializer
	permission_classes = [IsAuthenticated]

	def get_object(self):
		return self.request.user.UserProfile

# Create your views here.
@api_view(['GET'])
def get_data(request):
	data = [
		{"title": "Item 1", "description": "This is item 1"},
		{"title": "Item 2", "description": "This is item 2"},
		{"title": "Item 3", "description": "This is item 3"},
	]
	return Response(data)



# /////////////////// 42 auth //////////////////////////
@api_view(['GET'])
def ft_oauth_login(request):
	baseurl = 'https://api.intra.42.fr/oauth/authorize'
	parameters = {
		'client_id': 'u-s4t2ud-3875c51ca2d8d944d23520992353c921e7559a450f1cb4cf08c60123cdf632d5',
		'response_type': 'code',
		'redirect_uri': 'https://localhost:443/api/oauth/callback/',
	}
	url =  f"{baseurl}?{urlencode(parameters)}"
	return redirect(url)



# @api_view(['GET'])
# @permission_classes([AllowAny])
# def ft_oauth_login(request):
#     baseurl = 'https://api.intra.42.fr/oauth/authorize/'
#     parameters = {
#         'client_id': 'u-s4t2ud-3875c51ca2d8d944d23520992353c921e7559a450f1cb4cf08c60123cdf632d5',
#         'response_type': 'code',
#         'redirect_uri': 'http://localhost:80/api/oauth/callback/',
#     }
#     url = f"{baseurl}?{urlencode(parameters)}"
#     return redirect(url)

@api_view(['GET'])
def ft_oauth_callback(request):
    code = request.GET.get('code')
    # Exchange code for access token
    token_url = 'https://api.intra.42.fr/oauth/token/'
    token_data = {
        'grant_type': 'authorization_code',
        'client_id': 'u-s4t2ud-3875c51ca2d8d944d23520992353c921e7559a450f1cb4cf08c60123cdf632d5',
        'client_secret': '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',
        'code': code,
        'redirect_uri': 'https://localhost:443/api/oauth/callback/', 
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

    # #  Handle duplicate usernames/emails
    username = login_42
    if User.objects.filter(username=username).exists():
        username = f"{username}_{user_data.get('id')}"
    # if User.objects.filter(email=email).exists():
    #     email = None  # Or handle as per your policy

    # Create or get user
    try:
        profile = UserProfile.objects.get(login_42=login_42)
        user = profile.user
    except UserProfile.DoesNotExist:
        user = User.objects.create(username=username, email=email, first_name=first_name, last_name=last_name)
        user.set_unusable_password()
        user.save()
        profile = UserProfile.objects.create(user=user, display_name=username, login_42=login_42)
    return HttpResponse(user_id_42)


# @api_view(['GET'])
# @permission_classes([AllowAny])
# def ft_oauth_callback(request):
#     code = request.GET.get('code')
#     # state = request.GET.get('state')
#     # session_state = request.session.pop('oauth_state', '')

#     # # Verify state parameter
#     # if state != session_state:
#     #     return Response({'error': 'Invalid state parameter'}, status=status.HTTP_400_BAD_REQUEST)

#     # Exchange code for access token
#     token_url = 'https://api.intra.42.fr/oauth/token'
#     data = {
#         'grant_type': 'authorization_code',
#         'client_id': '166e03c8d9e8b6f3424e764949fe05acba027fdd45af464afabaf9dfbcc85ceb',
#         'client_secret': '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',
#         'code': code,
#         'redirect_uri': settings.REDIRECT_URI,
#     }
#     response = requests.post(token_url, data=data)
#     if response.status_code != 200:
#         return Response({'error': 'Failed to obtain access token'}, status=status.HTTP_400_BAD_REQUEST)

#     access_token = response.json().get('access_token')

#     # Get user info from 42 API
#     user_info_url = 'https://api.intra.42.fr/v2/me'
#     headers = {'Authorization': f'Bearer {access_token}'}
#     user_info_response = requests.get(user_info_url, headers=headers)
#     if user_info_response.status_code != 200:
#         return Response({'error': 'Failed to get user info'}, status=status.HTTP_400_BAD_REQUEST)

#     user_data = user_info_response.json()
#     login_42 = user_data.get('login')
#     email = user_data.get('email')
#     first_name = user_data.get('first_name')
#     last_name = user_data.get('last_name')

#     # Handle duplicate usernames/emails
#     username = login_42
#     if User.objects.filter(username=username).exists():
#         username = f"{username}_{user_data.get('id')}"
#     if User.objects.filter(email=email).exists():
#         email = None  # Or handle as per your policy

#     # Create or get user
#     try:
#         profile = Profile.objects.get(login_42=login_42)
#         user = profile.user
#     except Profile.DoesNotExist:
#         user = User.objects.create(username=username, email=email, first_name=first_name, last_name=last_name)
#         user.set_unusable_password()
#         user.save()
#         profile = Profile.objects.create(user=user, display_name=username, login_42=login_42)

#     # # Generate JWT tokens
#     # refresh = RefreshToken.for_user(user)
#     # tokens = {
#     #     'refresh': str(refresh),
#     #     'access': str(refresh.access_token),
#     # }

#     # Return tokens to frontend (e.g., via a redirect with tokens as query params)
#     # Be cautious with this approach; consider a more secure method
#     return redirect(f"/?access={tokens['access']}&refresh={tokens['refresh']}"
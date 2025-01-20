from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from urllib.parse import urlencode
from .models import User, Tournament
from .serializers import UserSerializer, TournamentSerializer
from rest_framework.views import viewsets

class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer

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
		'client_id': 'u-s4t2ud-166e03c8d9e8b6f3424e764949fe05acba027fdd45af464afabaf9dfbcc85ceb',
		'response_type': 'code',
		'redirect_uri': 'http://localhost:8000/api/oauth/callback',
	}
	url =  f"{baseurl}?{urlencode(parameters)}"
	return redirect(url)




def ft_oauth_callback(request):
	
	return render(request, 'home.html')
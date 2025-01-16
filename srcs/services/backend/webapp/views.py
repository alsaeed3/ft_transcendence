from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User, auth
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
# from .models import Feature

# Create your views here.
@api_view(['GET'])
def get_data(request):
	data = [
		{"title": "Item 1", "description": "This is item 1"},
		{"title": "Item 2", "description": "This is item 2"},
		{"title": "Item 3", "description": "This is item 3"},
	]
	return Response(data)
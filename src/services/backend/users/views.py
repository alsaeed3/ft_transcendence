from django.shortcuts import render, redirect
from urllib.parse import urlencode
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from .models import Profile
from .serializers import ProfileSerializer, UserRegistrationSerializer

class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProfileDetail(generics.RetrieveUpdateAPIView):
	queryset = Profile.objects.all()
	serializer_class = ProfileSerializer
	permission_classes = [IsAuthenticated]

	def get_object(self):
		return self.request.user.profile

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
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Friend
from .serializers import FriendSerializer

# Create your views here.
class FriendList(generics.ListCreateAPIView):
	serializer_class = FriendSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return Friend.objects.filter(user=self.request.user)

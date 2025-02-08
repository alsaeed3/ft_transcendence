from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.permissions import IsAuthenticated
from .models import User
from .serializers import UserSerializer
# from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
class UserLogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            # access_token = request.data['access']

            # Blacklist the refresh token
            refresh_token = RefreshToken(refresh_token)
            refresh_token.blacklist()

            # Blacklist the access token (optional)
            # access_token = AccessToken(access_token)
            # access_token.blacklist()

            return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProfileDetail(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class FriendListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.request.user.friends.all()

class FriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            friend = User.objects.get(pk=pk)
            if friend == request.user:
                return Response(
                    {'error': 'Cannot add yourself as friend'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if request.user.friends.filter(pk=friend.pk).exists():
                return Response(
                    {'error': 'Already friends'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            request.user.friends.add(friend)
            friend.friends.add(request.user)  # Make it bilateral
            
            return Response(
                {'message': 'Friend added successfully'}, 
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UnfriendView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            friend = User.objects.get(pk=pk)
            if not request.user.friends.filter(pk=friend.pk).exists():
                return Response(
                    {'error': 'Not friends'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            request.user.friends.remove(friend)
            friend.friends.remove(request.user)  # Remove bilateral friendship
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
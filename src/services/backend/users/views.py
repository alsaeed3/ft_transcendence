
from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.permissions import IsAuthenticated
from .models import User, BlockedUser
from .serializers import UserSerializer
# from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .models import Message
from django.db.models import Q

class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        user_to_block = User.objects.get(id=user_id)
        BlockedUser.objects.get_or_create(
            blocker=request.user,
            blocked=user_to_block
        )
        return Response({'status': 'user blocked'})

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserDetailView(generics.RetrieveUpdateAPIView):

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_messages(request, other_user_id):
    """
    Get all messages between the current user and another user
    """
    other_user = get_object_or_404(User, id=other_user_id)
    
    messages = Message.objects.filter(
        (Q(sender=request.user, receiver_id=other_user_id) |
         Q(sender_id=other_user_id, receiver=request.user))
    ).order_by('timestamp')
    
    return Response([{
        'id': msg.id,
        'content': msg.content,
        'sender_id': msg.sender.id,
        'sender_display_name': msg.sender.display_name or msg.sender.username,
        'timestamp': msg.timestamp,
        'read': msg.read
    } for msg in messages])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_read(request, other_user_id):
    """
    Mark all messages from other_user to current user as read
    """
    Message.objects.filter(
        sender_id=other_user_id,
        receiver=request.user,
        read=False
    ).update(read=True)
    
    return Response({'status': 'messages marked as read'})

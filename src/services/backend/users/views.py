from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.permissions import IsAuthenticated
from .models import User, BlockedUser
from .serializers import UserSerializer, MessageSerializer
# from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from .models import Message
from django.db.models import Q, Case, When, BooleanField
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            user_to_block = User.objects.get(id=user_id)
            BlockedUser.objects.get_or_create(
                blocker=request.user,
                blocked=user_to_block
            )
            return Response({'status': 'user blocked'})
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

class UnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        try:
            BlockedUser.objects.filter(
                blocker=request.user,
                blocked_id=user_id
            ).delete()
            return Response({'status': 'user unblocked'})
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.all()
        # Annotate users with blocked status
        if self.request.user.is_authenticated:
            blocked_users = BlockedUser.objects.filter(blocker=self.request.user)
            blocked_ids = blocked_users.values_list('blocked_id', flat=True)
            return queryset.annotate(
                is_blocked=Case(
                    When(id__in=blocked_ids, then=True),
                    default=False,
                    output_field=BooleanField(),
                )
            )
        return queryset

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
def get_chat_messages(request, user_id):
    try:
        # Get messages between current user and specified user
        messages = Message.objects.filter(
            (Q(sender=request.user, receiver_id=user_id) |
             Q(sender_id=user_id, receiver=request.user))
        ).order_by('timestamp')
        
        # Use MessageSerializer to serialize the messages
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    try:
        # Create new message
        message = Message.objects.create(
            sender=request.user,
            receiver_id=request.data.get('recipient'),
            content=request.data.get('message')
        )
        
        # Serialize the message for response
        serializer = MessageSerializer(message)
        return Response(serializer.data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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

# For WebSocket consumers
class ChatConsumer(AsyncWebsocketConsumer):
    async def chat_message(self, event):
        message = event['message']
        
        # If message is from database, serialize it
        if isinstance(message, Message):
            serializer = MessageSerializer(message)
            message_data = serializer.data
        else:
            message_data = message
            
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': message_data
        }))

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
        try:
            # Convert email to lowercase
            if 'email' in request.data:
                request.data['email'] = request.data['email'].lower()

            serializer = self.get_serializer(data=request.data)
            
            if not serializer.is_valid():
                errors = {}
                for field, error_list in serializer.errors.items():
                    if field == 'email':
                        errors['email'] = ['A user with this email already exists.']
                    else:
                        errors[field] = error_list
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)

            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

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

class UserProfileView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = 'user_id'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_public'] = True
        return context

# Friend-related views
class FriendListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            # Add debug logging
            print(f"Fetching friends for user: {self.request.user.username} (ID: {self.request.user.id})")
            friends = self.request.user.friends.all()
            print(f"Found {friends.count()} friends")
            return friends
        except Exception as e:
            print(f"Error in get_queryset: {str(e)}")
            return User.objects.none()

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in list method: {str(e)}")
            return Response(
                {'error': 'Failed to fetch friends list'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            friend = User.objects.get(pk=pk)
            
            # Add debug logging
            print(f"Current user ID: {request.user.id}, Friend ID: {friend.id}")
            print(f"Current user: {request.user.username}, Friend: {friend.username}")
            
            # Ensure we're comparing integers
            current_user_id = int(request.user.id)
            friend_id = int(pk)
            
            if current_user_id == friend_id:
                return Response(
                    {'error': 'Cannot add yourself as friend'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check for existing friendship in both directions
            if (request.user.friends.filter(pk=friend.pk).exists() or 
                friend.friends.filter(pk=request.user.pk).exists()):
                return Response(
                    {'error': 'Already friends'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create bilateral friendship
            request.user.friends.add(friend)
            friend.friends.add(request.user)
            
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

# Chat-related views
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

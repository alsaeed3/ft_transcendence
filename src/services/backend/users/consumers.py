# consumers.py
import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Q
from .models import Message, User
from django.core.cache import cache
from asgiref.sync import sync_to_async
import logging

logger = logging.getLogger(__name__)

class UserStatusConsumer(AsyncWebsocketConsumer):
    connected_users = {}  # Class variable to track all connected users

    async def connect(self):
        try:
            self.user = self.scope["user"]
            logger.info(f"Connection attempt from user: {getattr(self.user, 'id', 'anonymous')}")
            
            if not self.user.is_authenticated:
                logger.warning("Unauthenticated connection attempt")
                await self.close()
                return

            logger.info(f"User {self.user.id} connecting to status websocket")
            
            # Store the connection
            UserStatusConsumer.connected_users[self.user.id] = self
            
            # Accept the connection
            await self.accept()
            logger.info(f"Connection accepted for user {self.user.id}")
            
            # Get list of currently online users
            online_users = list(UserStatusConsumer.connected_users.keys())
            logger.info(f"Current online users: {online_users}")
            
            # Send initial status to the newly connected user
            await self.send(text_data=json.dumps({
                'type': 'initial_status',
                'online_users': online_users
            }))
            
            # Broadcast this user's online status to others
            await self.broadcast_status(self.user.id, True)
            
        except Exception as e:
            logger.error(f"Error in connect: {str(e)}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        try:
            if hasattr(self, 'user') and self.user.id in UserStatusConsumer.connected_users:
                logger.info(f"User {self.user.id} disconnecting from status websocket")
                # Remove from connected users
                del UserStatusConsumer.connected_users[self.user.id]
                
                # Broadcast offline status to others
                await self.broadcast_status(self.user.id, False)
        except Exception as e:
            logger.error(f"Error in disconnect: {str(e)}", exc_info=True)

    @classmethod
    async def broadcast_status(cls, user_id, is_online):
        try:
            message = {
                'type': 'status_update',
                'user_id': user_id,
                'online_status': is_online
            }
            logger.info(f"Broadcasting status: {message}")
            # Broadcast to all connected users except the sender
            for uid, connection in cls.connected_users.items():
                if uid != user_id:  # Don't send to self
                    try:
                        await connection.send(text_data=json.dumps(message))
                        logger.debug(f"Status sent to user {uid}")
                    except Exception as e:
                        logger.error(f"Error sending to user {uid}: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Error in broadcast_status: {str(e)}", exc_info=True)

    async def receive(self, text_data):
        try:
            # Handle any incoming messages if needed
            pass
        except Exception as e:
            logger.error(f"Error in receive: {str(e)}")

class PrivateChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get users from the URL parameters
        self.user1_id = self.scope['url_route']['kwargs']['user1_id']
        self.user2_id = self.scope['url_route']['kwargs']['user2_id']
        
        # Create a unique room name for these two users (sorted to ensure consistency)
        user_ids = sorted([int(self.user1_id), int(self.user2_id)])
        self.room_name = f"private_chat_{user_ids[0]}_{user_ids[1]}"
        self.user = self.scope.get('user')

        if self.user and self.user.is_authenticated and str(self.user.id) in [self.user1_id, self.user2_id]:
            # Join room group
            await self.channel_layer.group_add(
                self.room_name,
                self.channel_name
            )
            await self.accept()
            
            # Load and send chat history
            history = await self.get_chat_history()
            await self.send(text_data=json.dumps({
                'type': 'chat_history',
                'messages': history
            }))
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    @database_sync_to_async
    def save_message(self, message, sender_id, receiver_id):
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)
        return Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=message
        )

    @database_sync_to_async
    def get_chat_history(self):
        messages = Message.objects.filter(
            (Q(sender_id=self.user1_id) & Q(receiver_id=self.user2_id)) |
            (Q(sender_id=self.user2_id) & Q(receiver_id=self.user1_id))
        ).order_by('timestamp')
        
        return [{
            'message': msg.content,
            'sender_id': msg.sender.id,
            'sender_display_name': msg.sender.display_name,
            'timestamp': msg.timestamp.isoformat()
        } for msg in messages]

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message = data.get('message', '')
            
            if message:
                # Determine receiver ID
                receiver_id = self.user2_id if str(self.user.id) == self.user1_id else self.user1_id
                
                # Save message to database
                await self.save_message(message, self.user.id, receiver_id)
                
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender_id': self.user.id,
                        'sender_display_name': self.user.display_name,
                        'timestamp': datetime.datetime.now().isoformat()
                    }
                )
        except json.JSONDecodeError as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_display_name': event['sender_display_name'],
            'timestamp': event['timestamp']
        }))
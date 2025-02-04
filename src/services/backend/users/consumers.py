import json
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'global_chat'
        self.user = self.scope.get('user')

        if self.user and self.user.is_authenticated:
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
            
            # Send connection confirmation
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'Connected to chat'
            }))
        else:
            await self.close()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message = data.get('message', '')
            
            if message:
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'sender_id': self.user.id,
                        'sender_display_name': self.user.username,
                        'timestamp': datetime.datetime.now().isoformat()
                    }
                )
        except json.JSONDecodeError as e:
            print(f"Error decoding message: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))

    async def chat_message(self, event):
        # Send message to WebSocket
        try:
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': event['message'],
                'sender_id': event['sender_id'],
                'sender_display_name': event['sender_display_name'],
                'timestamp': event['timestamp']
            }))
        except Exception as e:
            print(f"Error sending message: {e}")
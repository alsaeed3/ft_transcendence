from rest_framework import serializers
# from django.contrib.auth.models import User
from .models import Message, User

class MessageSerializer(serializers.ModelSerializer):
    sender_display_name = serializers.CharField(source='sender.display_name', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'content', 'sender', 'receiver', 'timestamp', 'read', 'sender_display_name']
        read_only_fields = ['sender', 'timestamp', 'read']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'avatar', 
            'online_status', 'language_preference', 'email',
            'user_id_42', 'login_42', 'is_42_auth'
        ]
        extra_kwargs = {'password': {'write_only': True}}
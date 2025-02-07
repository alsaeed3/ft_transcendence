from rest_framework import serializers
# from django.contrib.auth.models import User
from .models import Message, User

class MessageSerializer(serializers.ModelSerializer):
    sender_display_name = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar_url = serializers.SerializerMethodField()
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'content', 'sender_id', 'receiver', 'timestamp', 'read', 
                 'sender_display_name', 'sender_avatar_url']
        read_only_fields = ['sender_id', 'timestamp', 'read']
    
    def get_sender_avatar_url(self, obj):
        return obj.sender.get_avatar_url()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'avatar', 
            'online_status', 'language_preference', 'email',
            'user_id_42', 'login_42', 'is_42_auth', 
            'password', 'match_wins', 'tourney_wins', 
            'total_matches', 'total_tourneys', 'avatar_url'
        ]
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
            'avatar': {'required': False},
            'display_name': {'required': False},
            'language_preference': {'required': False},
            'match_wins': {'required': False},
            'tourney_wins': {'required': False},
            'total_matches': {'required': False},
            'total_tourneys': {'required': False}
        }

    def update(self, instance, validated_data):
        # Remove password from validated data if it's empty
        password = validated_data.pop('password', None)
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update password if provided
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance

    def validate(self, data):
        # Optional: Add custom validation logic
        if 'username' in data:
            # Example: Prevent duplicate usernames
            existing_users = User.objects.exclude(pk=self.instance.pk)
            if existing_users.filter(username=data['username']).exists():
                raise serializers.ValidationError({"username": "This username is already taken."})
        
        return data

    def get_avatar_url(self, obj):
        return obj.get_avatar_url()
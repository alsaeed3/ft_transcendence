from rest_framework import serializers
# from django.contrib.auth.models import User
from .models import User

# Abdullah 42auth
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'avatar', 
            'online_status', 'language_preference', 'email',
            'user_id_42', 'login_42', 'is_42_auth', 
            'password'
        ]
        extra_kwargs = {
            'username': {'required': False},
            'email': {'required': False},
            'avatar': {'required': False},
            'display_name': {'required': False},
            'language_preference': {'required': False}
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
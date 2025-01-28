from rest_framework import serializers
# from django.contrib.auth.models import User
from .models import User

# Abdullah 42auth
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'avatar', 
            'online_status', 'language_preference', 'email',
            'user_id_42', 'login_42', 'is_42_auth'
        ]
        extra_kwargs = {'password': {'write_only': True}}
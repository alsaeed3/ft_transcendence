from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile

class ProfileSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = ['profile_picture', 'bio', 'language_preference']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    repeat_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'repeat_password']

    def validate(self, data):
        if data['password'] != data['repeat_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

# Abdullah 42auth
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['login_42', 'user_id_42', 'is_42_2fa_enabled', 'is_42_auth']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(source='userprofile')
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from users.models import User

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

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['login_42', 'user_id_42', 'is_42_auth']

class AuthUserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(source='userprofile')
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'avatar', 'online_status', 'profile']
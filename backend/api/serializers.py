import re, pyotp
from .models import Account
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password

class AccountSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[
            UniqueValidator(queryset=Account.objects.all(), message="Email already exists.")
        ]
    )
    username = serializers.CharField(
        required=True,
        min_length=2,
        max_length=32,
        validators=[
            UniqueValidator(queryset=Account.objects.all(), message="Username already exists."),
        ]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=4,
        max_length=32,
        validators=[validate_password],
    )
    first_name = serializers.CharField(
        write_only=True,
        required=True,
        min_length=2,
        max_length=32,
    )
    last_name = serializers.CharField(
        write_only=True,
        required=True,
        min_length=2,
        max_length=32,
    )

    class Meta:
        model = Account
        fields = ('id', 'username', 'email', 'password', 'first_name', 'last_name')

    def validate_username(self, value):
        # Username validation using regex
        if not re.match(r'^[a-z0-9_.]+$', value):
            raise serializers.ValidationError(
                "Username can only contain lowercase letters, numbers, underscores, and dots."
            )
        if '..' in value or '__' in value:
            raise serializers.ValidationError(
                "Username can't have consecutive dots or underscores."
            )
        if value.startswith('.') or value.startswith('_') or value.endswith('.') or value.endswith('_'):
            raise serializers.ValidationError(
                "Username can't start or end with a dot or an underscore."
            )
        return value

    def create(self, validated_data):
        user = Account.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        return user

class LoginSerializer(TokenObtainPairSerializer):
    username_field = 'username'

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        otp_token = attrs.get('otp_token')

        if username and password:
            user = authenticate(username=username, password=password)

            if user:
                if not user.is_active:
                    raise ValidationError('User account is disabled.')
                if user.is_2fa_enabled:
                    if not otp_token:
                        # 2FA is required but no token provided
                        raise ValidationError('Two-factor authentication token required.')
                    totp = pyotp.TOTP(user.otp_secret)
                    if not totp.verify(otp_token):
                        raise ValidationError('Invalid two-factor authentication token.')
                refresh = self.get_token(user)
                return {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_2fa_enabled': user.is_2fa_enabled,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'intra_login': user.login_intra,
                    }
                }
            else:
                raise ValidationError('Invalid credentials.')
        else:
            raise ValidationError('Must include "username" and "password".')


class Verify2FASerializer(serializers.Serializer):
    otp_token = serializers.CharField(min_length=6,max_length=6)

class TournamentSerializer(serializers.Serializer):
    creator_name = serializers.CharField(max_length=32)
    winner_nickname = serializers.CharField()
    participants_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
    )

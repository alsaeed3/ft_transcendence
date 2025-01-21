from rest_framework import serializers
from .models import UserProfile

class ProfileSerializer(serializers.ModelSerializer):
	class Meta:
		model = UserProfile
		fields = ['profile_picture', 'bio', 'language_preference']

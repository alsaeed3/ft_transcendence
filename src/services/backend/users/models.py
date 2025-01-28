from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    display_name = models.CharField(max_length=255, unique=True)
    language_preference = models.CharField(max_length=2, default='en')
    two_factor_enabled = models.BooleanField(default=False)
    user_id_42 = models.IntegerField(null=True, blank=True)
    login_42 = models.CharField(max_length=255, null=True, blank=True)
    is_42_auth = models.BooleanField(default=False)
    
    # Move friends field to bottom and use string reference
    friends = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='friend_of'
    )
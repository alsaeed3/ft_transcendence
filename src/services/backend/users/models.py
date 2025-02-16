from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

def user_avatar_path(instance, filename):
    # Generate path like: avatars/user_<id>/<filename>
    return f'avatars/user_{instance.id}/{filename}'

class User(AbstractUser):
    avatar = models.ImageField(
        upload_to=user_avatar_path,
        default='avatars/default.svg',  # Changed from .png to .svg
        null=True,
        blank=True
    )
    display_name = models.CharField(max_length=255, unique=True)
    language_preference = models.CharField(max_length=2, default='en')
    user_id_42 = models.IntegerField(null=True, blank=True)
    login_42 = models.CharField(max_length=255, null=True, blank=True)
    is_42_auth = models.BooleanField(default=False)
    is_2fa_enabled = models.BooleanField(default=False) # 2FA
    online_status = models.BooleanField(default=False)
    match_wins = models.IntegerField(default=0)
    tourney_wins = models.IntegerField(default=0)
    total_matches = models.IntegerField(default=0)
    total_tourneys = models.IntegerField(default=0)

    email_otp = models.CharField(max_length=6, null=True, blank=True) # 2FA
    otp_created_at = models.DateTimeField(null=True, blank=True) #`2FA`

    friends = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='friend_of'
    )

    email = models.EmailField(
        unique=True,
        error_messages={
            'unique': 'A user with this email already exists.',
        }
    )

    def get_avatar_url(self):
        if self.avatar and hasattr(self.avatar, 'url'):
            return self.avatar.url
        return '/media/avatars/default.svg'  # Consistent default path

    def generate_otp(self):
        import random
        self.email_otp = f"{random.randint(100000, 999999)}"
        self.otp_created_at = timezone.now()
        self.save()
        return self.email_otp

    def is_otp_valid(self, otp):
        """Simple OTP validation without rate limiting"""
        # Check if OTP exists
        if not self.email_otp or not self.otp_created_at:
            return False

        # Check if OTP matches
        if self.email_otp != otp:
            return False

        # Check if OTP is expired (older than 5 minutes)
        time_now = timezone.now()
        if time_now > self.otp_created_at + timedelta(minutes=5):
            return False

        # OTP is valid - clear it
        self.email_otp = None
        self.otp_created_at = None
        self.save()
        return True

class BlockedUser(models.Model):
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['sender', 'receiver']),
            models.Index(fields=['timestamp']),
        ]
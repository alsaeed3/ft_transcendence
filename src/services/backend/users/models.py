from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    display_name = models.CharField(max_length=255, unique=True)
    language_preference = models.CharField(max_length=2, default='en')
    user_id_42 = models.IntegerField(null=True, blank=True)
    login_42 = models.CharField(max_length=255, null=True, blank=True)
    is_42_auth = models.BooleanField(default=False)
    is_2fa_enabled = models.BooleanField(default=False) # 2FA
    online_status = models.BooleanField(default=False)
    email_otp = models.CharField(max_length=6, null=True, blank=True) # 2FA
    otp_created_at = models.DateTimeField(null=True, blank=True) #`2FA`

    friends = models.ManyToManyField(
        'self',
        symmetrical=False,
        blank=True,
        related_name='friend_of'
    )

    def generate_otp(self):
        import random
        self.email_otp = f"{random.randint(100000, 999999)}"
        self.otp_created_at = timezone.now()
        self.save()
        return self.email_otp

    def is_otp_valid(self, otp):
        if not self.email_otp or not self.otp_created_at:
            return False
        if self.email_otp != otp:
            return False
        if timezone.now() > self.otp_created_at + timedelta(minutes=5):
            return False
        return True
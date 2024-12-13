import pyotp
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser, BaseUserManager, Group, Permission
from django.core.exceptions import ValidationError


class MyAccountManager(BaseUserManager):
    def create_user(self, email, username, last_name, first_name, password=None, login_intra=None, display_name=None):
        if not email:
            raise ValueError("User must have an email address")
        if not username:
            raise ValueError("User must have a username")
        if not password:
            raise ValueError("User must have a password")
        if not first_name:
            raise ValueError("User must have a first_name")
        if not last_name:
            raise ValueError("User must have a last_name")
        
        user = self.model(
            email=self.normalize_email(email),
            username=username,
            display_name=display_name if display_name else username,
            login_intra=login_intra,
            first_name=first_name,
            last_name=last_name
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

class Account(AbstractUser):
    # Additional fields
    email = models.EmailField(verbose_name="email", max_length=60, unique=True)
    username = models.CharField(max_length=30, unique=True)
    display_name = models.CharField(max_length=32)
    login_intra = models.CharField(max_length=32, unique=True, null=True, blank=True)
    is_online = models.BooleanField(default=False)

    # Required fields for admin panel work properly
    is_admin        = models.BooleanField(default=False)
    is_active       = models.BooleanField(default=True)
    is_staff        = models.BooleanField(default=False)
    is_superuser    = models.BooleanField(default=False)

    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        related_name='account_set'
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        related_name='account_permissions_set'
    )

    otp_secret = models.CharField(
        max_length=32,
        default=pyotp.random_base32,
        editable=False,
    )
    is_2fa_enabled = models.BooleanField(default=False)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    objects = MyAccountManager()

    # This is what it returns when you don't access to a specific field
    def __str__(self):
        return f"{self.username} <Account>"
    
    def save(self, *args, **kwargs):

        # If the user exists in the database
        if self.pk:
            old_user = Account.objects.get(pk=self.pk)
        super(Account, self).save(*args, **kwargs)

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return True


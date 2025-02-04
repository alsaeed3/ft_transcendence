from django.contrib import admin
from .models import User, BlockedUser, Message

# Register your models here.
admin.site.register(User)
admin.site.register(BlockedUser)
admin.site.register(Message)
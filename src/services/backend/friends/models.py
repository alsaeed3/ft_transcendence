from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Friend(models.Model):
	user = models.ForeignKey(User, related_name='friends', on_delete=models.CASCADE)
	friend = models.ForeignKey(User, related_name='user_friends', on_delete=models.CASCADE)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ['user', 'friend']

	def __str__(self):
		return f'{self.user.username} is friends with {self.friend.username}'
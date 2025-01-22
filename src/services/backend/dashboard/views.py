from rest_framework import generics
from .models import Dashboard
from .serializers import DashboardSerializer
from rest_framework.permissions import IsAuthenticated

class DashboardDetail(generics.RetrieveAPIView):
    serializer_class = DashboardSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.dashboard
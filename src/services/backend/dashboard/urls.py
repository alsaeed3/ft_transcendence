from django.urls import path
from .views import DashboardDetail

urlpatterns = [
    path('', DashboardDetail.as_view(), name='dashboard-detail'),
]
from django.urls import path
from .views import DashboardDetail

urlpatterns = [
    path('api/dashboard/', DashboardDetail.as_view(), name='dashboard-detail'),
]
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DashboardStatsView, EmailLogViewSet

router = DefaultRouter()
router.register(r'', EmailLogViewSet, basename='email-log')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]

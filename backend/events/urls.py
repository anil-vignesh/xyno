from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EventViewSet, TriggerEventView

router = DefaultRouter()
router.register(r'definitions', EventViewSet, basename='event')

urlpatterns = [
    path('trigger/', TriggerEventView.as_view(), name='trigger-event'),
    path('', include(router.urls)),
]

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SESIntegrationViewSet

router = DefaultRouter()
router.register(r'', SESIntegrationViewSet, basename='ses-integration')

urlpatterns = [
    path('', include(router.urls)),
]

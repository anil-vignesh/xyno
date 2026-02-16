from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BrandComponentViewSet

router = DefaultRouter()
router.register(r'', BrandComponentViewSet, basename='brand-component')

urlpatterns = [
    path('', include(router.urls)),
]

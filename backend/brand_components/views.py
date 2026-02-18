from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import BrandComponent
from .serializers import BrandComponentListSerializer, BrandComponentSerializer


class BrandComponentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = BrandComponent.objects.filter(user__organization=self.request.user.organization)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return BrandComponentListSerializer
        return BrandComponentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

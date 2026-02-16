from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import APIKey
from .serializers import (
    APIKeyCreateSerializer,
    APIKeyListSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class UserProfileView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class APIKeyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return APIKey.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return APIKeyCreateSerializer
        return APIKeyListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_key = APIKey.generate_key()
        hashed_key = APIKey.hash_key(raw_key)

        api_key = APIKey.objects.create(
            key=hashed_key,
            prefix=raw_key[:8],
            name=serializer.validated_data['name'],
            user=request.user,
        )

        response_data = APIKeyListSerializer(api_key).data
        response_data['raw_key'] = raw_key

        return Response(response_data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.delete()

import hashlib

from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import APIKey


class APIKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        api_key = request.META.get('HTTP_X_API_KEY')
        if not api_key:
            return None

        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        try:
            api_key_obj = APIKey.objects.select_related('user').get(
                key=key_hash,
                is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid or inactive API key.')

        APIKey.objects.filter(pk=api_key_obj.pk).update(last_used_at=timezone.now())

        return (api_key_obj.user, api_key_obj)

    def authenticate_header(self, request):
        return 'X-API-Key'

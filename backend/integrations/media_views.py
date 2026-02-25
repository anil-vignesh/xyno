import logging
import uuid

import boto3
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class MediaUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.content_type not in ALLOWED_CONTENT_TYPES:
            return Response(
                {'error': 'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file.size > MAX_FILE_SIZE:
            return Response(
                {'error': 'File too large. Maximum size is 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bucket_name = getattr(settings, 'S3_MEDIA_BUCKET_NAME', '')
        region = getattr(settings, 'S3_MEDIA_REGION', '')
        if not bucket_name or not region:
            return Response(
                {'error': 'S3 storage is not configured. Contact your administrator.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        org_id = request.user.organization_id
        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else 'jpg'
        key = f'{org_id}/images/{uuid.uuid4().hex}.{ext}'

        client = boto3.client('s3', region_name=region)

        try:
            client.upload_fileobj(
                file,
                bucket_name,
                key,
                ExtraArgs={'ACL': 'public-read'},
            )
        except Exception as exc:
            logger.error(f'S3 upload failed for org {org_id}: {exc}')
            return Response(
                {'error': 'Upload failed. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        url = f'https://{bucket_name}.s3.{region}.amazonaws.com/{key}'

        return Response({'url': url}, status=status.HTTP_201_CREATED)

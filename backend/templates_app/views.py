from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from xyno.utils import get_environment_from_request

from .models import EmailTemplate
from .serializers import (
    EmailTemplateListSerializer,
    EmailTemplateSerializer,
    PlaceholderDefaultsSerializer,
    TemplatePreviewSerializer,
    TemplateUploadSerializer,
)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        env = get_environment_from_request(self.request)
        return EmailTemplate.objects.filter(user=self.request.user, environment=env)

    def get_serializer_class(self):
        if self.action == 'list':
            return EmailTemplateListSerializer
        return EmailTemplateSerializer

    def perform_create(self, serializer):
        env = get_environment_from_request(self.request)
        serializer.save(user=self.request.user, environment=env)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        template = self.get_object()
        serializer = TemplatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        context = serializer.validated_data.get('context', {})
        rendered_subject, rendered_html = template.render(context)
        return Response({
            'subject': rendered_subject,
            'html': rendered_html,
        })

    @action(detail=True, methods=['post'], url_path='update-placeholders')
    def update_placeholders(self, request, pk=None):
        """Update default values for template placeholders."""
        template = self.get_object()
        serializer = PlaceholderDefaultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Build a map of incoming defaults
        incoming = {
            p['name']: p['default_value']
            for p in serializer.validated_data['placeholders']
        }
        # Update existing placeholders with new defaults
        updated = []
        for entry in template.placeholders:
            name = entry['name'] if isinstance(entry, dict) else entry
            updated.append({
                'name': name,
                'default_value': incoming.get(name, entry.get('default_value', '') if isinstance(entry, dict) else ''),
            })
        template.placeholders = updated
        template.save(update_fields=['placeholders', 'updated_at'])

        return Response(
            EmailTemplateSerializer(template).data
        )

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        """Copy this sandbox template to production."""
        template = self.get_object()
        if template.environment != 'sandbox':
            return Response(
                {'detail': 'Only sandbox templates can be promoted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = EmailTemplate.objects.filter(
            user=request.user,
            name=template.name,
            environment='production',
        ).first()
        if existing:
            existing.subject = template.subject
            existing.html_content = template.html_content
            existing.design_json = template.design_json
            existing.placeholders = list(template.placeholders)
            existing.is_active = template.is_active
            existing.save()
            return Response(EmailTemplateSerializer(existing).data)
        else:
            production_copy = EmailTemplate.objects.create(
                name=template.name,
                subject=template.subject,
                html_content=template.html_content,
                design_json=template.design_json,
                placeholders=list(template.placeholders),
                user=request.user,
                environment='production',
                is_active=template.is_active,
            )
            return Response(
                EmailTemplateSerializer(production_copy).data,
                status=status.HTTP_201_CREATED,
            )

    @action(detail=False, methods=['post'], url_path='upload-html')
    def upload_html(self, request):
        serializer = TemplateUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        env = get_environment_from_request(request)
        template = EmailTemplate(
            name=serializer.validated_data['name'],
            subject=serializer.validated_data['subject'],
            html_content=serializer.validated_data['html_content'],
            design_json=None,
            user=request.user,
            environment=env,
        )
        template.save()
        return Response(
            EmailTemplateSerializer(template).data,
            status=status.HTTP_201_CREATED,
        )

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import APIKeyAuthentication
from integrations.models import SESIntegration
from templates_app.models import EmailTemplate
from xyno.utils import get_environment_from_request

from .models import Event
from .serializers import EventSerializer, TestEventSerializer, TriggerEventSerializer
from .tasks import send_event_email


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        env = get_environment_from_request(self.request)
        return Event.objects.filter(user=self.request.user, environment=env).select_related(
            'template', 'integration'
        )

    def perform_create(self, serializer):
        env = get_environment_from_request(self.request)
        serializer.save(user=self.request.user, environment=env)

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        """Copy this sandbox event to production, wiring production FKs."""
        event = self.get_object()
        if event.environment != 'sandbox':
            return Response(
                {'detail': 'Only sandbox events can be promoted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prod_template = None
        if event.template:
            prod_template = EmailTemplate.objects.filter(
                user=request.user,
                name=event.template.name,
                environment='production',
            ).first()

        prod_integration = None
        if event.integration:
            prod_integration = SESIntegration.objects.filter(
                user=request.user,
                name=event.integration.name,
                environment='production',
            ).first()

        warnings = []
        if event.template and not prod_template:
            warnings.append(f'Template "{event.template.name}" has not been promoted to production yet.')
        if event.integration and not prod_integration:
            warnings.append(f'Integration "{event.integration.name}" has not been configured for production yet.')

        existing = Event.objects.filter(
            user=request.user,
            slug=event.slug,
            environment='production',
        ).first()

        if existing:
            existing.name = event.name
            existing.description = event.description
            existing.template = prod_template
            existing.integration = prod_integration
            existing.is_active = event.is_active
            existing.save()
            data = EventSerializer(existing).data
            data['warnings'] = warnings
            return Response(data)
        else:
            prod_event = Event.objects.create(
                name=event.name,
                slug=event.slug,
                description=event.description,
                template=prod_template,
                integration=prod_integration,
                user=request.user,
                environment='production',
                is_active=event.is_active,
            )
            data = EventSerializer(prod_event).data
            data['warnings'] = warnings
            return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Send a test email for this event."""
        event = self.get_object()

        serializer = TestEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        recipient = serializer.validated_data['recipient']
        data = serializer.validated_data.get('data', {})

        if not event.template:
            return Response(
                {'detail': 'Event has no template configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not event.integration:
            return Response(
                {'detail': 'Event has no SES integration configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = send_event_email.delay(
            event_id=event.id,
            recipient=recipient,
            context_data=data,
        )

        return Response({
            'detail': f'Test email queued to {recipient}.',
            'task_id': str(task.id),
        })


class TriggerEventView(APIView):
    authentication_classes = [APIKeyAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TriggerEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event_slug = serializer.validated_data['event']
        recipient = serializer.validated_data['recipient']
        data = serializer.validated_data.get('data', {})

        # Environment is derived from the API key, not from any request header
        api_key_obj = request.auth
        environment = api_key_obj.environment

        try:
            event = Event.objects.select_related(
                'template', 'integration'
            ).get(
                user=request.user,
                slug=event_slug,
                environment=environment,
                is_active=True,
            )
        except Event.DoesNotExist:
            return Response(
                {'detail': f'Event "{event_slug}" not found or inactive in {environment} environment.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not event.template:
            return Response(
                {'detail': 'Event has no template configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not event.integration:
            return Response(
                {'detail': 'Event has no SES integration configured.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = send_event_email.delay(
            event_id=event.id,
            recipient=recipient,
            context_data=data,
        )

        return Response(
            {'detail': 'Email queued for sending.', 'task_id': str(task.id), 'environment': environment},
            status=status.HTTP_202_ACCEPTED,
        )

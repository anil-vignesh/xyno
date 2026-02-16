from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Event
from integrations.models import SESIntegration
from templates_app.models import EmailTemplate

from .filters import EmailLogFilter
from .models import EmailLog
from .serializers import EmailLogSerializer


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmailLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = EmailLogFilter

    def get_queryset(self):
        return EmailLog.objects.filter(
            user=self.request.user
        ).select_related('event', 'template', 'integration')


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        last_7_days = today - timedelta(days=7)
        last_30_days = today - timedelta(days=30)

        logs = EmailLog.objects.filter(user=user)

        daily_breakdown = list(
            logs.filter(sent_at__date__gte=last_7_days)
            .values('sent_at__date')
            .annotate(
                sent=Count('id', filter=Q(status='sent')),
                failed=Count('id', filter=Q(status='failed')),
            )
            .order_by('sent_at__date')
        )

        for item in daily_breakdown:
            item['date'] = str(item.pop('sent_at__date'))

        recent_logs = EmailLogSerializer(
            logs.order_by('-sent_at')[:10], many=True
        ).data

        stats = {
            'total_sent': logs.filter(status='sent').count(),
            'total_failed': logs.filter(status='failed').count(),
            'sent_today': logs.filter(status='sent', sent_at__date=today).count(),
            'sent_last_7_days': logs.filter(status='sent', sent_at__date__gte=last_7_days).count(),
            'sent_last_30_days': logs.filter(status='sent', sent_at__date__gte=last_30_days).count(),
            'active_integrations': SESIntegration.objects.filter(user=user, is_active=True).count(),
            'active_events': Event.objects.filter(user=user, is_active=True).count(),
            'total_templates': EmailTemplate.objects.filter(user=user).count(),
            'daily_breakdown': daily_breakdown,
            'recent_logs': recent_logs,
        }
        return Response(stats)

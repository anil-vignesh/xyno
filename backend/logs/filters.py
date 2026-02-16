import django_filters
from django.db import models

from .models import EmailLog


class EmailLogFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=EmailLog.STATUS_CHOICES)
    recipient = django_filters.CharFilter(lookup_expr='icontains')
    event = django_filters.NumberFilter(field_name='event__id')
    event_slug = django_filters.CharFilter(field_name='event__slug')
    template = django_filters.NumberFilter(field_name='template__id')
    integration = django_filters.NumberFilter(field_name='integration__id')
    sent_after = django_filters.DateTimeFilter(field_name='sent_at', lookup_expr='gte')
    sent_before = django_filters.DateTimeFilter(field_name='sent_at', lookup_expr='lte')
    search = django_filters.CharFilter(method='search_filter')

    class Meta:
        model = EmailLog
        fields = ['status', 'recipient', 'event', 'template', 'integration']

    def search_filter(self, queryset, name, value):
        return queryset.filter(
            models.Q(recipient__icontains=value)
            | models.Q(subject__icontains=value)
            | models.Q(ses_message_id__icontains=value)
        )

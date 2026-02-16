from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/integrations/', include('integrations.urls')),
    path('api/templates/', include('templates_app.urls')),
    path('api/events/', include('events.urls')),
    path('api/logs/', include('logs.urls')),
    path('api/brand-components/', include('brand_components.urls')),
]

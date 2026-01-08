
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

urlpatterns = [
    path('', lambda request: redirect('/api/login/', permanent=False)),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("api/metrics/", include("django_prometheus.urls")), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




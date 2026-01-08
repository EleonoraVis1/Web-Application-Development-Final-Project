from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework.views import exception_handler



def handler400(request, exception=None):
    return JsonResponse({"error": "Bad Request"}, status=400)

def handler403(request, exception=None):
    return JsonResponse({"error": "Forbidden"}, status=403)

def handler404(request, exception=None):
    return JsonResponse({"error": "Not Found"}, status=404)

def handler500(request):
    return JsonResponse({"error": "Server Error"}, status=500)

def drf_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        return response

    return JsonResponse({"error": "Server Error"}, status=500)
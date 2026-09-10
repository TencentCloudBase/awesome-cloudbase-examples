from django.http import JsonResponse
from datetime import datetime

def index(request):
    return JsonResponse({
        "message": "Hello World from Django HTTP Function!",
        "path": request.path,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })

def hello(request):
    return JsonResponse({
        "message": "Hello World from Django HTTP Function!",
        "method": request.method,
        "path": request.path,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })

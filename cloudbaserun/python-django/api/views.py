from django.http import JsonResponse
from datetime import datetime
def index(request):
    return JsonResponse({"message":"Hello World from Django on CloudBase Run!","timestamp":datetime.utcnow().isoformat()+"Z"})

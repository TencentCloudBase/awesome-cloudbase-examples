import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloudrun.settings_scf")
application = get_wsgi_application()

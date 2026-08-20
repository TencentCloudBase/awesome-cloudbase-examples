import os

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "cloudbase-django-http-function-demo-key")
DEBUG = False
ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "cloudrun.urls"
WSGI_APPLICATION = "cloudrun.wsgi.application"
INSTALLED_APPS = ["api"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"

import os
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "demo-key")
DEBUG = False; ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "cloudrun.urls"; INSTALLED_APPS = ["api"]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
USE_TZ = True; LANGUAGE_CODE = "zh-hans"

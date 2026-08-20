# Django Template

HTTP example built with Python Django framework, deployed as a CloudBase CloudRun / HTTP function.

## Deployment

This template ships as a CloudBase pre-built container image; **no local build is required**:

```text
imagePath:     crunbuild-az-new.tencentcloudcr.com/cloudbase/cbrf-template-django-example:v1.0.0
containerPort: 8080
```

Selecting this template via the CloudBase console or `tcb` CLI will spawn a CloudRun / HTTP function instance from the image above.

## Source Code

* GitHub: [cloudrun-django](https://github.com/TencentCloudBase/cloudrun-django)
* Gitee: [cloudrun-django](https://gitee.com/TencentCloudBase/cloudrun-django)

## Local Development

```bash
git clone https://github.com/TencentCloudBase/cloudrun-django.git
cd cloudrun-django
pip install -r requirements.txt
python manage.py runserver
```

## Note

This directory only carries the template metadata (`cloudbase-template*.json`); the application source lives in the `cloudrun-django` repository linked above.

# Django CloudBase Run

Django framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t python-django .
docker run -p 8080:8080 python-django
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

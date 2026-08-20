# Laravel CloudBase Run

Laravel framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t php-laravel .
docker run -p 8080:8080 php-laravel
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

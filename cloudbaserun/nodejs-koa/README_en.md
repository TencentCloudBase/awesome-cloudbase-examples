# Koa CloudBase Run

Koa framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t nodejs-koa .
docker run -p 8080:8080 nodejs-koa
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

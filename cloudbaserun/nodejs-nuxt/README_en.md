# Nuxt.js CloudBase Run

Nuxt.js framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t nodejs-nuxt .
docker run -p 8080:8080 nodejs-nuxt
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

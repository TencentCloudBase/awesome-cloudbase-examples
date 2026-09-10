# Next.js CloudBase Run

Next.js framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t nodejs-nextjs .
docker run -p 8080:8080 nodejs-nextjs
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

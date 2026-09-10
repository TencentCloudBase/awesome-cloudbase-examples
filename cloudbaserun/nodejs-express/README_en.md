# Express CloudBase Run

Express framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t nodejs-express .
docker run -p 8080:8080 nodejs-express
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

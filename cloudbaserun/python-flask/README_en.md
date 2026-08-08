# Flask CloudBase Run

Flask framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t python-flask .
docker run -p 8080:8080 python-flask
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

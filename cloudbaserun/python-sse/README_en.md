# Python SSE CloudBase Run Template

A Server-Sent Events (SSE) example built with Python Flask, deployed via Docker to CloudBase Run.

## Quick Start

```bash
docker build -t python-sse .
docker run -p 8080:8080 python-sse
# Visit http://localhost:8080
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

# Node.js CloudBase Run Template

A minimal Node.js CloudBase Run (container deployment) helloworld example.

## Quick Start

```bash
# Run locally (Docker required)
docker build -t nodejs-helloworld .
docker run -p 8080:8080 nodejs-helloworld
# Visit http://localhost:8080
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

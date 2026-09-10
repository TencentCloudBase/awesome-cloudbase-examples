# PHP CloudBase Run Template

A minimal PHP CloudBase Run (container deployment) helloworld example.

## Quick Start

```bash
# Run locally (Docker required)
docker build -t php-helloworld .
docker run -p 8080:8080 php-helloworld
# Visit http://localhost:8080
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

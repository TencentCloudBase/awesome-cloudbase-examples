# Spring Boot CloudBase Run

Spring Boot framework CloudBase Run container deployment example.

## Quick Start

```bash
docker build -t java-springboot .
docker run -p 8080:8080 java-springboot
```

## Deploy to CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

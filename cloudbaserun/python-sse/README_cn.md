# Python SSE 云托管模板

基于 Python Flask 实现的 Server-Sent Events（SSE）实时推送示例，通过 Docker 容器部署到 CloudBase Run。

## 快速开始

```bash
docker build -t python-sse .
docker run -p 8080:8080 python-sse
# 访问 http://localhost:8080
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

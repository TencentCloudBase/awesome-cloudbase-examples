# Express 云托管

基于 Express 框架的 CloudBase Run 容器部署示例。

## 快速开始

```bash
docker build -t nodejs-express .
docker run -p 8080:8080 nodejs-express
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

# Node.js 云托管模板

基于 Node.js 语言的 CloudBase Run（云托管）helloworld 示例。

## 快速开始

```bash
# 本地运行（需要 Docker）
docker build -t nodejs-helloworld .
docker run -p 8080:8080 nodejs-helloworld
# 访问 http://localhost:8080
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

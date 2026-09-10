# Node.js WebSocket 云托管模板

基于 Node.js + Express-WS 实现的 WebSocket 实时通信示例，通过 Docker 容器部署到 CloudBase Run。

## 快速开始

```bash
npm install
npm start
# WebSocket 连接 ws://localhost:8080
```

## 部署到 CloudBase Run

```bash
tcb cloudrun deploy --yes -e <ENV_ID>
```

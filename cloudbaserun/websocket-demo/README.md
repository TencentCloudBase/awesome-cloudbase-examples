# 云托管（容器型） WebSocket 示例

这是一个在云托管（容器型）上部署 WebSocket 应用的示例项目，基于 Express.js 和 express-ws 实现。

## 项目结构

```
.
├── app/
│   └── server.js    # 主服务器文件
├── Dockerfile       # Docker 配置文件
├── package.json     # 项目依赖配置
└── README.md        # 项目说明文档
```

其中 app/server.js 是使用 express 和 express-ws 实现的服务，云托管会根据 Dockerfile 来构建容器。


## 部署调试

### 部署到云托管

1. 登录腾讯云：
```bash
npm run login
```

2. 部署应用：
```bash
npm run deploy
```

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

实例部署完成以后，前往 [云开发控制台](https://tcb.cloud.tencent.com/dev)

在左侧导航栏选择【云托管】, 在【服务列表】页面可以找到刚刚部署的实例，点击进入【服务详情】页面，在详情页可以找到默认域名。
将默认域名开头的 `https://` 替换为 `ws://` 或者 `wss://` ，在 Postman 等工具中进行 WebSocket 连接测试。

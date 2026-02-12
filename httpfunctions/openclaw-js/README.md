# OpenClaw JavaScript 模板

基于 [OpenClaw](https://openclaw.ai/) 开源 AI 助手的 JavaScript Agent 函数型模板。本模板提供了将 OpenClaw Agent 快速部署为 HTTP 云函数的完整解决方案，支持流式响应、用户认证等功能。

## 📋 项目概述

[OpenClaw](https://openclaw.ai/)（原名 Clawdbot/Moltbot）是一个免费、开源的自主 AI 助手，可以在用户自己的设备上运行，通过消息应用与用户交互，执行各种自动化任务。

本模板使用 `@cloudbase/agent-adapter-llm` 适配器，通过 OpenAI 兼容接口接入 OpenClaw，封装为符合 AG-UI 协议的 Agent 服务，并通过 `@cloudbase/agent-server` 提供标准的 HTTP API 接口。

在云开发中使用 OpenClaw 模版，请参考[基于 OpenClaw 开发](https://docs.cloudbase.net/ai/agent-development/frameworks/openclaw)文档。

### 核心特性

- ✅ **OpenClaw 集成** - 快速接入开源 AI 助手 OpenClaw
- ✅ **OpenAI 兼容接口** - 使用标准 OpenAI SDK 进行通信
- ✅ **流式响应支持** - 支持 SSE 流式返回，实时响应
- ✅ **用户认证中间件** - 支持 JWT Token 用户身份识别
- ✅ **纯 JavaScript** - 无需 TypeScript 编译，开箱即用

### 调用链路

```
客户端 → HTTP 云函数 → OpenClaw Gateway → LLM → 流式响应返回
```

## 使用方法

### Agent 实例创建

在 `createAgent` 函数中，配置 OpenClaw 连接参数：

```javascript
import { LLMAgent } from "@cloudbase/agent-adapter-llm";
import OpenAI from "openai";

function createAgent({ request }) {
  const agent = new LLMAgent({
    model: new OpenAI({
      apiKey: process.env.OPENCLAW_GATEWAY_TOKEN || "",
      baseURL: process.env.OPENCLAW_BASE_URL || "",
    }),
    modelName: `openclaw:${process.env.OPENCLAW_AGENT_ID || "main"}`,
  });
  // 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}
```

### 用户参数注入

通过 AG-UI 的 [`Middleware` 机制](https://docs.ag-ui.com/concepts/middleware)，可以在 Agent 处理请求前注入用户信息：

```javascript
function createAgent({ request }) {
  const agent = new LLMAgent({ ... });
  // 使用中间件从 JWT 提取用户信息
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}
```

`DetectCloudbaseUserMiddleware` 中间件会自动从 HTTP 请求的 `Authorization` header 中提取 JWT Token，解析出用户 ID（`sub` 字段），并将其注入到 `input.state.__request_context__` 中，使 Agent 能获取到当前请求用户的身份信息。

### 路由自动生成

使用 `@cloudbase/agent-server` 提供的 `createExpressRoutes` 函数自动生成符合 AG-UI 协议的 HTTP 路由：

```javascript
createExpressRoutes({
  createAgent,
  express: app,
});
```

这会自动创建以下标准路由：

- `POST /send-message` - AG-UI 协议的消息发送接口（SSE 流式响应）
- `POST /chat/completions` - OpenAI 兼容的聊天接口
- `GET /healthz` - 健康检查接口

## 🚀 快速开始

### 环境要求

- Node.js >= 20

### 第 1 步：安装依赖

```bash
npm install
```

### 第 2 步：配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下环境变量：

```env
# OpenClaw Gateway Token（API 密钥）
OPENCLAW_GATEWAY_TOKEN=your_gateway_token_here

# OpenClaw API 基础 URL
OPENCLAW_BASE_URL=your_base_url_here

# OpenClaw Agent ID（智能体 ID，默认为 main）
OPENCLAW_AGENT_ID=your_agent_id_here
```

### 第 3 步：启动服务

```bash
npm start
```

服务将在 `http://localhost:9000` 启动。

## 📖 获取 OpenClaw 配置信息

1. 访问 OpenClaw 服务或部署本地 OpenClaw 实例
2. 创建或选择一个 Agent 应用
3. 在应用设置中获取 **Gateway Token**、**Base URL** 和 **Agent ID**

## 🔧 本地调试

### 使用 cURL 测试

```bash
# 发送消息（流式响应）
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "test-run-001",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "你好，请介绍一下自己"
      }
    ],
    "tools": [],
    "context": [],
    "state": {},
    "forwardedProps": {}
  }'
```

### 带用户认证的请求

```bash
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "test-run-002",
    "messages": [{"id": "msg-1", "role": "user", "content": "你好"}],
    "tools": [],
    "context": [],
    "state": {},
    "forwardedProps": {}
  }'
```

### 使用 OpenAI 兼容接口

```bash
curl -X POST http://localhost:9000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openclaw:main",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": true
  }'
```

## 📁 项目结构

```
openclaw-js/
├── src/
│   ├── index.js              # 主入口文件
│   └── utils.js              # 工具函数和中间件
├── .env.example              # 环境变量示例
├── package.json              # 项目配置
├── scf_bootstrap             # 云函数启动脚本
├── Dockerfile                # Docker 镜像配置
└── README.md                 # 本文件
```

## 📚 相关资源

### 官方文档

- [CloudBase 云开发文档](https://docs.cloudbase.net/)
- [AG-UI 协议规范](https://github.com/ag-ui-protocol/ag-ui)
- [AG-Kit 文档](https://docs.agkit.dev)

### SDK 和工具

- [@cloudbase/agent-adapter-llm](https://www.npmjs.com/package/@cloudbase/agent-adapter-llm) - LLM 适配器
- [@cloudbase/agent-server](https://www.npmjs.com/package/@cloudbase/agent-server) - Agent 服务器
- [openai](https://www.npmjs.com/package/openai) - OpenAI Node.js SDK

---

如有问题，请访问 [GitHub Issues](https://github.com/TencentCloudBase/awesome-cloudbase-examples/issues) 或查看 [官方文档](https://docs.cloudbase.net/)。

# ADP JavaScript 模板

基于腾讯云智能体开发平台（ADP）的 JavaScript Agent 函数型模板。本模板提供了将 ADP 智能体快速部署为 HTTP 云函数的完整解决方案，支持流式响应、用户认证、自定义参数等功能。

## 📋 项目概述

本模板使用 `@cloudbase/agent-adapter-adp` 适配器，将腾讯云 ADP（原 LKE）智能体封装为符合 AG-UI 协议的 Agent 服务，并通过 `@cloudbase/agent-server` 提供标准的 HTTP API 接口。

### 核心特性

- ✅ **ADP 智能体集成** - 快速接入腾讯云智能体开发平台
- ✅ **自定义参数支持** - 支持传递自定义变量到工作流和知识库
- ✅ **工作流集成** - 支持 ADP 工作流和工具调用事件

### 调用链路

```
客户端 → HTTP 云函数 → ADP Agent → 腾讯云 ADP 服务 → 流式响应返回
```

## 使用方法

### Agent 适配与自定义

通过继承 `AdpAgent` 类，可以自定义请求体的生成逻辑，实现参数的灵活传递。例如，用户可以在标准 AG-UI 协议中的 `forwardedProps` 字段传递自定义参数（如模型名称、自定义变量等，详细字段参数可以查看 [ADP 官方文档](https://cloud.tencent.com/document/product/1759/105561#ba7e0c00-8616-468c-8734-6cc13b4c51af)），并注入到 ADP 请求中：

```javascript
class MyAgent extends AdpAgent {
  generateRequestBody({ message, fileInfos, runId, threadId, forwardedProps }) {
    const req = super.generateRequestBody({
      message,
      fileInfos,
      runId,
      threadId,
      forwardedProps,
    });
    // 从 forwardedProps 提取自定义参数
    req.modelName = forwardedProps.modelName || "";
    // 可以继续添加更多自定义逻辑
    // req.customVariables = forwardedProps.customVariables || {};
    // req.searchNetwork = forwardedProps.searchNetwork || "enable";
    return req;
  }
}
```

### 用户参数注入

通过 AG-UI 的 [`Middleware` 机制](https://docs.ag-ui.com/concepts/middleware)，可以在 Agent 处理请求前注入用户信息：

```javascript
function createAgent({ request }) {
  const agent = new MyAgent({ ... });
  // 使用中间件从 JWT 提取用户信息
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}
```

`DetectCloudbaseUserMiddleware` 中间件会自动从 HTTP 请求的 `Authorization` header 中提取 JWT Token，解析出用户 ID（`sub` 字段），并在默认情况下将其注入到 `input.state.__request_context__` 中。Agent 中会以 `input.state.__request_context__.user.id` > `forwardedProps.visitorBizId` > `randomUUID()` 的顺序来确定用户 ID，Agent 就能获取到当前请求用户的身份信息，辅助 ADP 实现多租户隔离的功能。你也可以参照 `Agent 适配与自定义` 中的示例，通过重写 `generateRequestBody` 方法将用户 ID 注入到请求体的 `visitorBizId` 中来实现同样的功能。

### 历史消息处理机制

ADP 会自动管理对话历史的保存与恢复，开发者**无需**在客户端手动拼接完整的历史记录。

**消息裁剪规则**：

当你在 `messages` 数组中传递多轮对话历史时，适配器会自动进行以下处理：

1. **从后往前扫描消息列表**，找到最后一条 `assistant` 角色的消息
2. **丢弃该消息及之前的所有内容**（包括该 assistant 消息本身）
3. **只保留最后一条 assistant 消息之后的用户消息**作为本次请求内容

**示例**：

```javascript
// 客户端发送的消息
{
  "messages": [
    { "id": "msg-1", "role": "user", "content": "你是谁" },
    { "id": "msg-2", "role": "assistant", "content": "我是 AI 助手" },  // ← 从这里开始裁剪
    { "id": "msg-3", "role": "user", "content": "你能做什么？" }
  ]
}

// 实际发送给 ADP 的内容
// 只包含: "user: 你能做什么？"
// msg-1 和 msg-2 被自动裁剪
```

**最佳实践**：

```javascript
// ✅ 推荐：只发送当前用户的新消息
{
  "threadId": "conversation-123",
  "messages": [
    { "id": "msg-new", "role": "user", "content": "新的问题" }
  ]
}

// ⚠️ 不推荐：发送完整历史（会被自动裁剪）
{
  "threadId": "conversation-123",
  "messages": [
    { "id": "msg-1", "role": "user", "content": "历史问题1" },
    { "id": "msg-2", "role": "assistant", "content": "历史回答1" },
    { "id": "msg-3", "role": "user", "content": "新的问题" }
  ]
}
```

如果传递了包含历史记录的消息数组，适配器会发送一个 `RAW` 类型的警告事件，告知有多少条消息被裁剪。

### Agent 实例创建

在 `createAgent` 函数的参数中，管理 Agent 实例的配置，可以调整 ADP 应用密钥等配置，详细请查看 `@cloudbase/agent-adapter-adp` 包文档：

```javascript
function createAgent() {
  const agent = new AdpAgent({
    adpConfig: {
      appKey: process.env.ADP_APP_KEY || "",
      credential: {
        // 当 enableUpload 为 true 时， credential 为必填项
        // 方法 1/1+2 二选一，云函数环境下已自动注入，无需手动配置
        // 1. 从环境变量中获取腾讯云用户认证信息
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
        // 2. 获取临时密钥 sessionToken（https://cloud.tencent.com/document/product/1312/48197）
        token: process.env.TENCENTCLOUD_SESSIONTOKEN || "",
      },
      // 启用文件/图片上传功能（需要配置 credential）
      enableUpload: false,
    },
  });
  return { agent };
}
```

#### `enableUpload` 参数说明

| 参数           | 类型      | 默认值  | 说明                      |
| -------------- | --------- | ------- | ------------------------- |
| `enableUpload` | `boolean` | `false` | 是否启用文件/图片上传功能 |

**使用前提**：启用 `enableUpload` 功能需要先配置 `credential`（腾讯云 API 密钥）。在云函数环境下，密钥会自动注入环境变量，无需手动配置。

**功能说明**：开启后，用户可以在对话中上传文件或图片，适配器会自动处理文件解析并将文件信息传递给 ADP 服务进行处理。

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
# ADP 应用密钥
ADP_APP_KEY=your_adp_app_key_here

# 腾讯云 API 密钥（可选，仅在启用文件/图片上传功能时需要配置）
TENCENTCLOUD_SECRETID=your_secret_id_here
TENCENTCLOUD_SECRETKEY=your_secret_key_here
```

### 第 3 步：启动服务

```bash
npm start
```

服务将在 `http://localhost:9000` 启动。

## 📖 获取 ADP AppKey

1. 前往 [腾讯云智能体开发平台](https://adp.cloud.tencent.com/adp/#/app/home)
2. 在应用开发页签，选择或创建一个应用
3. 点击应用行右侧操作区域的「调用」按钮
4. 在弹窗中复制 **AppKey**

详细教程请参考：[ADP 应用密钥获取指南](https://cloud.tencent.com/document/product/1759/104209#b38b2119-e126-4ad3-aa4f-4c3a19a7f4a0)

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
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "你好"
      }
    ],
    "tools": [],
    "context": [],
    "state": {},
    "forwardedProps": {}
  }'
```

### 传递自定义参数

```bash
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "test-run-005",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "你好"
      }
    ],
    "tools": [],
    "context": [],
    "state": {},
    "forwardedProps": {
      "modelName": "gpt-4",
      "customKey": "customValue"
    }
  }'
```

### 使用 OpenAI 兼容接口

```bash
curl -X POST http://localhost:9000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "你好"
      }
    ],
    "stream": true
  }'
```

## 📁 项目结构

```
adp-js/
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

- [腾讯云智能体开发平台（ADP）](https://cloud.tencent.com/document/product/1759)
- [CloudBase 云开发文档](https://docs.cloudbase.net/)
- [AG-UI 协议规范](https://github.com/ag-ui-protocol/ag-ui)
- [AG-Kit 文档](https://docs.agkit.dev)

### SDK 和工具

- [@cloudbase/agent-adapter-adp](https://www.npmjs.com/package/@cloudbase/agent-adapter-adp) - ADP 适配器
- [@cloudbase/agent-server](https://www.npmjs.com/package/@cloudbase/agent-server) - Agent 服务器

---

如有问题，请访问 [GitHub Issues](https://github.com/TencentCloudBase/awesome-cloudbase-examples/issues) 或查看 [官方文档](https://cloud.tencent.com/document/product/1759)。

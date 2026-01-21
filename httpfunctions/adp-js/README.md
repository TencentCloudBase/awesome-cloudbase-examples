# ADP JavaScript 模板

基于腾讯云智能体开发平台（ADP）的 JavaScript Agent 函数型模板。本模板提供了将 ADP 智能体快速部署为 HTTP 云函数的完整解决方案，支持流式响应、用户认证、自定义参数等功能。

## 📋 项目概述

本模板使用 `@cloudbase/agent-adapter-adp` 适配器，将腾讯云 ADP（原 LKE）智能体封装为符合 AG-UI 协议的 Agent 服务，并通过 `@cloudbase/agent-server` 提供标准的 HTTP API 接口。

### 核心特性

- ✅ **ADP 智能体集成** - 快速接入腾讯云智能体开发平台
- ✅ **自定义参数支持** - 支持传递自定义变量到工作流和知识库
- ✅ **工作流集成** - 支持 ADP 工作流和工具调用事件
- ✅ **无需构建** - 纯 JavaScript，直接运行

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
    return req;
  }
}
```

### 用户参数注入

```javascript
app.use(express.json());
app.use(detectCloudbaseUserMiddleware); // 提取用户信息
```

`detectCloudbaseUserMiddleware` 中间件会自动从 HTTP 请求的 `Authorization` header 中提取 JWT Token，解析出用户 ID（`sub` 字段），并将其注入到 `forwardedProps.visitorBizId` 中。这样 Agent 就能获取到当前请求用户的身份信息，辅助 ADP 实现多租户隔离的功能。

### 历史消息处理机制

ADP 会自动管理对话历史的保存与恢复，开发者**无需**在客户端手动拼接完整的历史记录。

**消息裁剪规则**：

当你在 `messages` 数组中传递多轮对话历史时，适配器会自动进行以下处理：

1. **从后往前扫描消息列表**，找到最后一条 `assistant` 角色的消息
2. **丢弃该消息及之前的所有内容**（包括该 assistant 消息本身）
3. **只保留最后一条 assistant 消息之后的用户消息**作为本次请求内容

**最佳实践**：

```javascript
// ✅ 推荐：只发送当前用户的新消息
{
  "threadId": "conversation-123",
  "messages": [
    { "id": "msg-new", "role": "user", "content": "新的问题" }
  ]
}
```

如果传递了包含历史记录的消息数组，适配器会发送一个 `RAW` 类型的警告事件，告知有多少条消息被裁剪。

### Agent 实例创建

在 `createAgent` 函数的参数中，管理 Agent 实例的配置，可以调整 ADP 应用密钥与优先模型配置等：

```javascript
function createAgent() {
  const agent = new MyAgent({
    adpConfig: {
      appKey: process.env.ADP_APP_KEY || "",
      credential: {
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
      },
    },
  });
  return { agent };
}
```

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

创建 `.env` 文件：

```env
# ADP 应用密钥（必填）
ADP_APP_KEY=your_adp_app_key_here

# 腾讯云 API 密钥（选填）
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

## 🔧 本地调试

### 使用 cURL 测试

```bash
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "test-run-001",
    "messages": [{"id": "msg-1", "role": "user", "content": "你好"}],
    "tools": [],
    "context": [],
    "state": {},
    "forwardedProps": {}
  }'
```

## 📁 项目结构

```
adp-js/
├── src/
│   ├── index.js              # 主入口文件
│   └── utils.js              # 工具函数和中间件
├── package.json              # 项目配置
├── scf_bootstrap             # 云函数启动脚本
├── Dockerfile                # Docker 镜像配置
└── README.md                 # 本文件
```

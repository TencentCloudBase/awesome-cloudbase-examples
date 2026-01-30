# 腾讯元器 JavaScript 模板

基于腾讯元器的 JavaScript Agent 函数型模板。本模板提供了将腾讯元器智能体快速部署为 HTTP 云函数的完整解决方案，支持流式响应、用户认证、对话历史持久化、自定义参数等功能。

## 📋 项目概述

本模板使用 `@cloudbase/agent-adapter-yuanqi` 适配器，将腾讯元器智能体封装为符合 AG-UI 协议的 Agent 服务，并通过 `@cloudbase/agent-server` 提供标准的 HTTP API 接口。

### 核心特性

- ✅ **腾讯元器集成** - 快速接入腾讯元器智能体平台
- ✅ **对话历史持久化** - 通过云开发数据库自动保存和加载对话历史
- ✅ **自定义参数支持** - 支持传递自定义变量到工作流和知识库
- ✅ **思考/推理支持** - 支持元器模型的推理内容展示

### 调用链路

```
客户端 → HTTP 云函数 → Yuanqi Agent → 腾讯元器服务 → 流式响应返回
                            ↓
                    云开发数据库（对话历史）
```

## 使用方法

### Agent 适配与自定义

通过继承 `YuanqiAgent` 类，可以自定义请求体的生成逻辑和对话历史的处理方式。例如，用户可以在标准 AG-UI 协议中的 `forwardedProps` 字段传递自定义参数（如自定义变量等，详细字段参数可以查看 [腾讯元器官方文档](https://yuanqi.tencent.com/guide/publish-agent-api-documentation)），并注入到元器请求中：

```javascript
import { YuanqiAgent } from "@cloudbase/agent-adapter-yuanqi";

class MyAgent extends YuanqiAgent {
  // 重写请求体生成方法
  generateRequestBody({ messages, input }) {
    const { forwardedProps } = input;
    // 调用父类方法生成基础请求体
    const req = super.generateRequestBody({
      messages,
      input,
    });
    // 可以在这里对 messages 进行处理
    req.messages = messages || [];
    // 或者从 forwardedProps 中提取额外参数
    req.customVariables = forwardedProps?.myVariable || {};
    return req;
  }

  // 重写父类方法，自定义获取历史对话的逻辑
  async getChatHistory(subscriber, latestUserMessage) {
    // 调用父类方法获取历史对话（从云开发数据库读取）
    const history = await super.getChatHistory(subscriber, latestUserMessage);
    // 也可以忽略父类方法，自行处理历史对话的获取逻辑
    // const history = await myMethodToGetChatHistory(subscriber, latestUserMessage);
    return history;
  }

  // 重写父类方法，自定义保存历史对话的逻辑
  // async saveChatHistory(
  //   subscriber,
  //   input,
  //   userRecordId,
  //   assistantRecordId,
  //   userContent,
  //   assistantContent,
  // ) {}
}
```

### 用户认证中间件

本模板提供了 `DetectCloudbaseUserMiddleware` 中间件类，用于从 HTTP 请求中提取用户身份信息：

```javascript
import { DetectCloudbaseUserMiddleware } from "./utils.js";

function createAgent({ request }) {
  const agent = new MyAgent({
    yuanqiConfig: {
      appId: process.env.YUANQI_APP_ID || "",
      appKey: process.env.YUANQI_APP_KEY || "",
    },
  });
  // 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}
```

`DetectCloudbaseUserMiddleware` 中间件会自动从 HTTP 请求的 `Authorization` header 中提取 JWT Token，解析出用户 ID（`sub` 字段），并将其注入到 `input.state.__request_context__` 中。Agent 中会以 `input.state.__request_context__.user.id` > `forwardedProps.userId` > `randomUUID()` 的顺序来确定用户 ID，Agent 就能获取到当前请求用户的身份信息，辅助元器 Agent 实现多租户隔离的功能。

### 历史消息处理机制

`@cloudbase/agent-adapter-yuanqi` 适配器会通过云开发数据库自动管理对话历史的保存与加载。开发者只需要传递当前用户的最新消息，适配器会自动：

1. 从云开发数据库加载历史对话（默认 10 轮，可通过 `historyCount` 配置）
2. 将历史对话与当前消息合并后发送给元器
3. 自动保存用户消息和 AI 回复到数据库

**自定义历史对话处理**：

如果需要自定义历史对话的获取逻辑，可以重写 `getChatHistory` 方法：

```javascript
async getChatHistory(subscriber, latestUserMessage) {
  // 自定义获取历史对话的逻辑
  const history = await myCustomHistoryService.getHistory();
  return history;
}
```

**客户端请求示例**：

```json
// ✅ 推荐：只发送当前用户的消息，历史对话由服务端自动管理
{
  "threadId": "conversation-123",
  "messages": [{ "id": "msg-new", "role": "user", "content": "新的问题" }]
}
```

### Agent 实例创建

在 `createAgent` 函数中配置 Agent 实例，需要提供元器应用的 `appId`、`appKey` 以及可选的云开发配置：

```javascript
import { DetectCloudbaseUserMiddleware } from "./utils.js";

function createAgent({ request }) {
  // 创建元器 Agent 实例
  const agent = new MyAgent({
    yuanqiConfig: {
      appId: process.env.YUANQI_APP_ID || "",
      appKey: process.env.YUANQI_APP_KEY || "",
      request: {
        headers: {
          ...headers,
        },
      },
      // 云开发环境 ID，用于对话历史持久化
      envId: process.env.CLOUDBASE_ENV_ID || "",
      credential: {
        // 方法 1/1+2 二选一，云函数环境下已自动注入，无需手动配置
        // 1. 从环境变量中获取腾讯云用户认证信息
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
        // 2. 获取临时密钥 sessionToken（https://cloud.tencent.com/document/product/1312/48197）
        token: process.env.TENCENTCLOUD_SESSIONTOKEN || "",
      },
      // 可以自行增减历史对话轮数
      historyCount: 20,
    },
  });
  // 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
  agent.use(new DetectCloudbaseUserMiddleware(request));
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

创建 `.env` 文件（参考 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下环境变量：

```env
# 腾讯元器应用配置（必填）
YUANQI_APP_ID=your_yuanqi_app_id_here
YUANQI_APP_KEY=your_yuanqi_app_key_here

# 云开发配置（对话历史持久化需要）
CLOUDBASE_ENV_ID=your_cloudbase_env_id_here

# 腾讯云认证信息（对话历史持久化需要，云函数环境下已自动注入，本地开发需要配置）
# 方法 1: 使用永久密钥
TENCENTCLOUD_SECRETID=your_secret_id_here
TENCENTCLOUD_SECRETKEY=your_secret_key_here

# 方法 2: 使用临时密钥
# TENCENTCLOUD_SESSIONTOKEN=your_session_token_here
```

**环境变量说明**：

| 变量名                      | 说明                         | 是否必填           |
| --------------------------- | ---------------------------- | ------------------ |
| `YUANQI_APP_ID`             | 腾讯元器应用 ID              | ✅ 必填            |
| `YUANQI_APP_KEY`            | 腾讯元器应用密钥             | ✅ 必填            |
| `CLOUDBASE_ENV_ID`          | 云开发环境 ID                | 对话历史持久化需要 |
| `TENCENTCLOUD_SECRETID`     | 腾讯云 SecretId              | 对话历史持久化需要 |
| `TENCENTCLOUD_SECRETKEY`    | 腾讯云 SecretKey             | 对话历史持久化需要 |
| `TENCENTCLOUD_SESSIONTOKEN` | 腾讯云临时密钥 Session Token | 对话历史持久化需要 |

> **注意**：在云函数环境下，`TENCENTCLOUD_SECRETID`、`TENCENTCLOUD_SECRETKEY` 和 `TENCENTCLOUD_SESSIONTOKEN` 已自动注入，无需手动配置。

### 第 3 步：启动服务

```bash
npm start
```

服务将在 `http://localhost:9000` 启动。

## 📖 获取元器 AppId 和 AppKey

1. 前往 [腾讯元器平台](https://yuanqi.tencent.com)
2. 登录后进入「我的智能体」页面
3. 选择或创建一个智能体应用
4. 在应用设置中找到并复制 **App ID** 和 **App Key**

详细教程请参考：[腾讯元器开发文档](https://yuanqi.tencent.com/guide/publish-agent-api-documentation)

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
yuanqi-js/
├── src/
│   ├── index.js              # 主入口文件
│   └── utils.js              # 工具函数和中间件
├── .env.example              # 环境变量示例
├── package.json              # 项目配置
├── scf_bootstrap             # 云函数启动脚本
├── Dockerfile                # Docker 镜像配置
└── README.md                 # 本文件
```

## 🐳 Docker 部署

本项目提供了 Dockerfile，支持容器化部署：

```bash
# 构建镜像
docker build -t yuanqi-agent .

# 运行容器（基础配置）
docker run -p 9000:9000 \
  -e YUANQI_APP_ID=your_app_id \
  -e YUANQI_APP_KEY=your_app_key \
  yuanqi-agent

# 运行容器（包含对话历史持久化配置）
docker run -p 9000:9000 \
  -e YUANQI_APP_ID=your_app_id \
  -e YUANQI_APP_KEY=your_app_key \
  -e CLOUDBASE_ENV_ID=your_env_id \
  -e TENCENTCLOUD_SECRETID=your_secret_id \
  -e TENCENTCLOUD_SECRETKEY=your_secret_key \
  yuanqi-agent
```

## 📚 相关资源

### 官方文档

- [腾讯元器平台](https://yuanqi.tencent.com)
- [腾讯元器 API 接口文档](https://yuanqi.tencent.com/guide/publish-agent-api-documentation)
- [CloudBase 云开发文档](https://docs.cloudbase.net/)
- [AG-UI 协议规范](https://github.com/ag-ui-protocol/ag-ui)
- [AG-Kit 文档](https://docs.agkit.dev)

### SDK 和工具

- [@cloudbase/agent-adapter-yuanqi](https://www.npmjs.com/package/@cloudbase/agent-adapter-yuanqi) - 元器适配器
- [@cloudbase/agent-server](https://www.npmjs.com/package/@cloudbase/agent-server) - Agent 服务器

---

如有问题，请访问 [GitHub Issues](https://github.com/TencentCloudBase/awesome-cloudbase-examples/issues) 或查看 [腾讯元器 API 接口文档](https://yuanqi.tencent.com/guide/publish-agent-api-documentation)。

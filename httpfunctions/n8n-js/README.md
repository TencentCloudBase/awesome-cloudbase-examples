# n8n JavaScript 示例

基于 n8n Webhook 的 Agent 示例项目，可部署至腾讯云 CloudBase 作为 HTTP 云函数运行。

> 📚 **参考文档**：[CloudBase AI Agent 开发指南](https://docs.cloudbase.net/ai/agent-development/)

## 功能概述

本项目创建了一个基于 n8n Webhook 的 AI 对话代理服务，具备以下特性：

- 通过 n8n Webhook 连接 n8n 工作流
- 支持流式响应（SSE）
- 支持 OpenTelemetry 可观测性
- 通过 Express 提供 HTTP API
- 可部署为 CloudBase HTTP 云函数

## 核心依赖

| 包名 | 说明 |
|------|------|
| [@cloudbase/agent-server](https://www.npmjs.com/package/@cloudbase/agent-server) | CloudBase Agent 服务端，提供 AG-UI 协议路由 |
| [@cloudbase/agent-adapter-n8n](https://www.npmjs.com/package/@cloudbase/agent-adapter-n8n) | n8n 适配器，将 n8n Webhook 响应转换为 AG-UI 格式 |
| [@cloudbase/agent-observability](https://www.npmjs.com/package/@cloudbase/agent-observability) | 可观测性支持，OpenTelemetry traces 导出 |

## 环境要求

- Node.js >= 20
- 运行中的 n8n 实例，且已配置 "When chat message received" 触发器节点

## 环境变量配置

启动服务前，需要配置以下环境变量：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `N8N_WEBHOOK_URL` | ✅ | n8n Webhook URL，来自 "When chat message received" 节点 |
| `AUTO_TRACES_STDOUT` | ❌ | 设为 `false` 或 `0` 关闭可观测性（默认启用） |

复制 `.env.example` 并重命名为 `.env`，填入实际值：

```bash
cp .env.example .env
```

## 安装依赖

```bash
npm i
```

## 启动服务

```bash
node src/index.js
```

服务启动后监听 `http://localhost:9000`。

## API 调用

本项目基于 AG-UI 协议提供 API，支持 SSE 流式传输。

### 本地调用

```bash
curl 'http://localhost:9000/send-message' \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "threadId": "thread-001",
    "runId": "run-001",
    "messages": [
      { "id": "msg-1", "role": "user", "content": "你好" }
    ],
    "tools": [],
    "context": [],
    "state": {}
  }'
```

### 部署后调用

部署到 CloudBase 后，接口地址为 `https://{envId}.api.tcloudbasegateway.com/v1/aibot/bots/{agentId}/send-message`，需携带 API Key：

```bash
curl 'https://{envId}.api.tcloudbasegateway.com/v1/aibot/bots/{agentId}/send-message' \
  -H 'Authorization: Bearer <YOUR_API_KEY>' \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "threadId": "thread-001",
    "runId": "run-001",
    "messages": [
      { "id": "msg-1", "role": "user", "content": "你好" }
    ],
    "tools": [],
    "context": [],
    "state": {}
  }'
```

更多调用方式请参考官方文档：[cURL 调用](https://docs.cloudbase.net/ai/agent-development/integration/curl)

## 项目结构

```
├── src/
│   ├── index.js       # 应用入口，Express 服务配置
│   └── agent.js       # n8n Agent 创建逻辑
├── .env.example       # 环境变量示例
├── Dockerfile         # 云托管部署配置
├── scf_bootstrap      # 云函数启动脚本
└── package.json       # 依赖配置
```

## 部署到 CloudBase

详细部署步骤请参考官方文档：[HTTP 云函数部署](https://docs.cloudbase.net/ai/agent-development/deployment/cloud-function)

## n8n Workflow 配置

> **重要**：要实现全流式响应，需要在工作流中**每个支持流式的节点**上都开启 Options → **Enable Streaming**，包括 Chat Trigger 的 `responseMode: "streaming"` 和 AI Agent 节点的 `enableStreaming: true`。如果有遗漏，响应将退化为非流式（等待全部生成完毕后一次性返回）。

### 拓扑结构

```
┌─────────────────────┐
│ When chat message   │
│    received         │
│  [Chat Trigger]     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     AI Agent        │
└──┬────────┬────┬────┘
   │        │    │
   │        │    └──────────┐
   │        │               │
   ▼        ▼               ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ OpenAI  │ │ Simple  │ │  Code   │
│  Chat   │ │ Memory  │ │  Tool   │
│  Model  │ │         │ │         │
│  [LLM]  │ │[Memory] │ │ [Tool]  │
└─────────┘ └─────────┘ └─────────┘

* OpenAI Chat Model 为必需节点
```

### 创建步骤

1. 在 n8n 编辑器中创建 Workflow
2. Import from File，导入以下 JSON 配置：

```json
{
  "name": "Streaming Chat Agent",
  "nodes": [
    {
      "parameters": {
        "public": true,
        "mode": "webhook",
        "options": {
          "responseMode": "streaming"
        }
      },
      "type": "@n8n/n8n-nodes-langchain.chatTrigger",
      "typeVersion": 1.4,
      "position": [
        0,
        0
      ],
      "id": "ef3760a9-f5c9-4a49-87f9-862f5b02a2b8",
      "name": "When chat message received",
      "webhookId": "1eeea1c1-643f-4c99-bd65-119874e51a56"
    },
    {
      "parameters": {
        "options": {
          "systemMessage": "You are a helpful assistant",
          "enableStreaming": true
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [
        224,
        0
      ],
      "id": "0a1cddd9-b008-462f-940a-81b643446ace",
      "name": "AI Agent"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "value": "z-ai/glm4.7",
          "mode": "id"
        },
        "responsesApiEnabled": false,
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1.3,
      "position": [
        144,
        240
      ],
      "id": "0fd8dd83-9fab-4a06-b88e-b482adbd610b",
      "name": "OpenAI Chat Model",
      "credentials": {
        "openAiApi": {
          "id": "YOUR_CREDENTIAL_ID",
          "name": "your-openai-provider"
        }
      }
    },
    {
      "parameters": {},
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [
        304,
        240
      ],
      "id": "695042c0-8668-4a97-87ca-26d02e4b63c1",
      "name": "Simple Memory"
    },
    {
      "parameters": {
        "description": "call this tool to get a watermark.",
        "jsCode": "// Example: convert the incoming query to uppercase and return it\nreturn \"my-n8n-agent\""
      },
      "type": "@n8n/n8n-nodes-langchain.toolCode",
      "typeVersion": 1.3,
      "position": [
        448,
        224
      ],
      "id": "286b2640-1314-467a-85da-31f23d1d95f6",
      "name": "Code Tool"
    }
  ],
  "pinData": {},
  "connections": {
    "When chat message received": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Simple Memory": {
      "ai_memory": [
        [
          {
            "node": "AI Agent",
            "type": "ai_memory",
            "index": 0
          }
        ]
      ]
    },
    "Code Tool": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": true,
  "settings": {
    "executionOrder": "v1",
    "binaryMode": "separate",
    "availableInMCP": false
  },
  "versionId": "dcef4898-8dfd-4149-bd95-9443b75dc59e",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "YOUR_INSTANCE_ID"
  },
  "id": "dDBt_S_Ns1D8JQGxMu_Nq",
  "tags": []
}
```

这是一个相对完整的 n8n Agent Workflow，包含以下节点：

| 节点 | 类型 | 说明 | 是否必需 |
|------|------|------|----------|
| **When chat message received** | Chat Trigger | 接收 webhook 请求，启用流式响应 | 是 |
| **AI Agent** | Agent | 执行 LLM 推理和工具调用 | 是 |
| **OpenAI Chat Model** | Language Model | LLM 模型配置，支持 OpenAI 兼容 API | 是 |
| **Simple Memory** | Memory | 维护对话上下文历史 | 可选 |
| **Code Tool** | Tool | 简单示例工具，模拟生成静态水印 | 可选 |

**自定义建议：**
- **Memory** 和 **Code Tool** 可以根据需求调整或删除
- **OpenAI Chat Model** 是必需节点，用于配置 LLM 提供商和模型

3. 保存 workflow，点击右上角 **Publish** 发布（发布后 webhook 即可访问）

### 配置 LLM 提供商

导入 workflow 后，配置 AI Agent 的 Model 节点：

1. 点击 **AI Agent** 节点下方关联的 **Model** 节点（默认为 OpenAI Chat Model）

2. **Credential（凭证）配置**：
    - 如果 LLM 提供商被 n8n 内置支持（如 OpenAI、Anthropic），直接选择对应凭证类型
    - 对于 OpenAI 兼容的自定义提供商：
        - 点击 **Credential** → **Create New Credential**
        - 选择 **OpenAI API** 类型
        - 在 **Base URL** 填入你的 API 端点（如 `https://api.provider.chat/v1`）
        - 填入 **API Key**

3. **Model（模型）配置**：
    - **Model 选择方式**：选择 **By ID**（而非预设列表）
    - **Model ID**：填入自定义模型名称（如 `deepseek-reasoner`等）

4. 点击右上角 **Save** 保存，然后点击 **Publish** 正式发布工作流

5. **获取访问链接**：
    - 点击第一个节点 **When chat message received**
    - 在节点配置面板中找到 **Chat URL**
    - 该 URL 即为 webhook 端点（如 `http://localhost:5678/webhook/xxx/chat`）

## Webhook 认证配置（可选）

如果 n8n Webhook 节点启用了认证，需要在创建 Agent 时通过 `request.headers` 传入对应的认证信息。

推荐使用 **Basic Auth**，在 n8n 中最易配置：

```javascript
const agent = new N8nAgent({
  n8nConfig: {
    webhookUrl,
    request: {
      headers: {
        Authorization: `Basic ${Buffer.from("user:pass").toString("base64")}`,
      },
    },
  },
});
```

**n8n 配置**：Webhook 节点 → Authentication → **Basic Auth** → 填入用户名和密码。

> n8n 也支持 Header Auth 和 JWT Auth，同样通过 `request.headers` 传入对应的 HTTP Header 即可。

## 可观测性配置

本项目支持 OpenTelemetry 协议的可观测性（Observability）功能，可以追踪 n8n Webhook 调用的执行链路（traces）并导出到控制台或 OTLP 后端（如 Langfuse、Jaeger 等）。

### 启用方式

本项目提供两种启用可观测性的方式：

#### 方式一：环境变量（推荐用于部署环境）

可观测性默认启用。如需在 `.env` 文件中显式控制：

```bash
# 关闭可观测性
AUTO_TRACES_STDOUT=false
```

或在云函数控制台配置环境变量。

#### 方式二：代码配置（推荐用于开发调试）

在 `src/index.js` 中修改 `createExpressRoutes` 的配置：

```javascript
createExpressRoutes({
  createAgent,
  express: app,
  logger,
  // 显式传入可观测性配置
  observability: { type: ExporterType.Console },
});
```

### 关闭可观测性

如需关闭可观测性功能，可采用以下任一方式：

**方式一：环境变量**

```bash
AUTO_TRACES_STDOUT=false
```

**方式二：代码配置**

```javascript
observability: undefined,
```

### 输出格式

启用后，traces 将以 JSON 格式输出到 stdout，每行一个 span，便于使用 `grep`、`jq` 等工具分析。

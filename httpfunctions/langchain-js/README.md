# LangChain JavaScript 示例

基于 LangChain JavaScript 的 Agent 示例项目，可部署至腾讯云 CloudBase 作为 HTTP 云函数运行。

> 📚 **参考文档**：[CloudBase AI Agent 开发指南](https://docs.cloudbase.net/ai/agent-development/)

## 功能概述

本项目创建了一个基于 LangChain 的 AI 对话代理服务，具备以下特性：

- 使用 OpenAI 兼容的 LLM 接口
- 支持对话记忆（MemorySaver）
- 通过 Express 提供 HTTP API
- 可部署为 CloudBase HTTP 云函数

## 核心依赖

| 包名 | 说明 |
|------|------|
| [@cloudbase/agent-server](https://www.npmjs.com/package/@cloudbase/agent-server) | CloudBase Agent 服务端，提供 AG-UI 协议路由 |
| [@cloudbase/agent-adapter-langchain](https://www.npmjs.com/package/@cloudbase/agent-adapter-langchain) | LangChain 适配器，将 LangChain Agent 转换为 AG-UI 格式 |
| [@langchain/openai](https://www.npmjs.com/package/@langchain/openai) | LangChain OpenAI 集成 |
| [@langchain/langgraph](https://www.npmjs.com/package/@langchain/langgraph) | LangGraph 状态管理，提供 MemorySaver 等 |
| [langchain](https://www.npmjs.com/package/langchain) | LangChain 核心库 |

## 环境要求

- Node.js >= 20

## 环境变量配置

启动服务前，需要配置以下环境变量：

| 变量名 | 必填 | 说明                                                              |
|--------|------|-----------------------------------------------------------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 密钥或兼容服务的 API 密钥                                      |
| `OPENAI_BASE_URL` | ✅ | API 基础地址，如 `https://api.openai.com/v1`                          |
| `OPENAI_MODEL` | ✅ | 模型名称，如 `gpt-4o` 或 `gpt-3.5-turbo`                               |
| `LOG_LEVEL` | ❌ | 日志级别，可选值：`trace`/`debug`/`info`/`warn`/`error`/`fatal`，默认 `info` |
| `ENABLE_CORS` | ❌ | 是否启用 CORS，设为 `true` 启用。本地开发跨域调试时可启用，生产环境建议通过网关配置                |
| `AUTO_TRACES_STDOUT` | ❌ | 是否启用可观测日志打印到stdout                        |

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
│   ├── index.js       # 应用入口
│   ├── agent.js       # Agent 逻辑
│   └── utils.js       # 工具函数
├── .env.example       # 环境变量示例
├── Dockerfile         # 云托管部署配置
├── scf_bootstrap      # 云函数启动脚本
└── package.json       # 依赖配置
```
 
## 部署到 CloudBase

详细部署步骤请参考官方文档：[HTTP 云函数部署](https://docs.cloudbase.net/ai/agent-development/deployment/cloud-function)

## 自定义 Agent

修改 `src/agent.js` 中的 `systemPrompt` 可自定义 Agent 角色：

```javascript
systemPrompt: "你是一位精通云开发 CloudBase 的专家，擅长回答任何相关的问题。"
```

## 可观测性配置

本项目支持 OpenTelemetry 协议的可观测性（Observability）功能，可以追踪 Agent 的执行链路（traces）并导出到控制台或 OTLP 后端（如 Langfuse、Jaeger 等）。

### 启用方式

本项目提供两种启用可观测性的方式：

#### 方式一：环境变量（推荐用于部署环境）

在 `.env` 文件中设置：

```bash
# 启用可观测性（设为 true、1、yes 均可启用，设为 false 或 0 则关闭）
AUTO_TRACES_STDOUT=true
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

**方式一：本地开发（.env 文件）**

```bash
# 关闭可观测性
AUTO_TRACES_STDOUT=false
```

**方式二：云函数控制台（部署环境）**

在 CloudBase 云函数控制台的环境变量设置中，添加：

| 变量名 | 值 |
|--------|-----|
| `AUTO_TRACES_STDOUT` | `false` |

**方式三：代码配置**

```javascript
observability: undefined,
```

### 输出格式

启用后， traces 将以 JSON 格式输出到 stdout，每行一个 span，便于使用 `grep`、`jq` 等工具分析。

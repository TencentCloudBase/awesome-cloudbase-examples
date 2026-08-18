# Cloudbase Agent (TypeScript)

基于 Express + AG-UI 协议的云开发智能体服务，支持对话、会话管理、语音转换、推荐问题等功能，支持双前缀路由挂载。

## 架构概述

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Express Server (:9000)                        │
│                                                                          │
│  AG-UI 标准路由 (createExpressRoutes 自动注册)                           │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │ /send-message   │  │ /chat/completions│  │ /agui                   │  │
│  │ (AG-UI 协议)    │  │ (OpenAI 兼容)    │  │ (AG-UI 原生)            │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬────────────────┘  │
│           └────────────────────┼──────────────────────┘                   │
│                                ▼                                          │
│                    DetectCloudbaseUserMiddleware                          │
│                          (JWT 认证)                                      │
│                                │                                          │
│  业务路由 (双前缀: / & /v1/aibot/bots/:botId)                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GET  /                    Bot 信息                              │    │
│  │  GET  /healthz             健康检查                              │    │
│  │  POST /wx-send-message     微信消息接口                          │    │
│  │  GET  /records             查询历史聊天记录                      │    │
│  │  POST /recommend-questions 获取推荐问题(SSE)                     │    │
│  │  POST /speech-to-text      语音转文字(ASR)                       │    │
│  │  POST /text-to-speech      文字转语音(TTS)                       │    │
│  │  GET  /text-to-speech      查询TTS结果                           │    │
│  │  POST /conversation        创建会话                              │    │
│  │  GET  /conversation        查询会话列表                          │    │
│  │  PATCH/DELETE /conversation/:conversation  更新/删除会话          │    │
│  │  POST/GET /feedback        用户反馈(stub)                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└──────────────┬───────────────────────┬──────────────────────────────────┘
               │                       │
               ▼                       ▼
┌────────────────────────┐  ┌─────────────────────────┐
│   CloudbaseAgent       │  │    WeChatAgent           │
│ (extends AbstractAgent)│◄─┤ (wraps CloudbaseAgent)   │
└───────────┬────────────┘  └─────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────┐
│                     Business Services                         │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐    │
│  │ MainChat     │  │ ChatHistory     │  │ ChatTool     │    │
│  │ Service      │  │ Service         │  │ Service      │    │
│  └──────┬───────┘  └─────────────────┘  └──────────────┘    │
│         │                                                    │
│  ┌──────┴───────────┐  ┌───────────────────────────┐        │
│  │ ChatContext      │  │ ConversationRelation      │        │
│  │ Service          │  │ Service                   │        │
│  └──────────────────┘  └───────────────────────────┘        │
│                                                              │
│  ┌───────────────────────────┐                               │
│  │ RecommendQuestionsService │                               │
│  └───────────────────────────┘                               │
│                │                                             │
│                ▼                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              LLMCommunicator                           │  │
│  │  OpenAI SDK + @cloudbase/agent-adapter-llm 流处理     │  │
│  │  (convertMessagesToOpenAI + processOpenAIStream)       │  │
│  │                                                       │  │
│  │  streamEvents() → AG-UI 事件零翻译透传                │  │
│  │  stream()       → IMsgResult SSE 翻译输出             │  │
│  └───────────────────────┬───────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│                   ┌──────────────┐                           │
│                   │  McpClient   │                           │
│                   └──────────────┘                           │
└──────────────────────────────────────────────────────────────┘
```

## 目录结构

```
cloudbase-ts/
├── src/
│   ├── index.ts                           # Express 应用入口，路由注册
│   ├── agent.ts                           # CloudbaseAgent (AG-UI AbstractAgent)
│   ├── adapters/
│   │   └── context-adapter.ts             # Express Request → CloudbaseContext 转换
│   ├── middlewares/
│   │   └── detect-user.ts                 # JWT 用户认证中间件
│   ├── services/
│   │   ├── chat_main.service.ts           # 主对话服务（SSE 直出 chat() + AG-UI 透传 chatStream()）
│   │   ├── chat_history.service.ts        # 历史记录 CRUD（云开发数据模型 API）
│   │   ├── chat_context.service.ts        # 对话上下文组装（系统提示词、历史、工具结果）
│   │   ├── chat_tool.service.ts           # 工具调用（联网搜索、知识库、数据模型、文件、语音）
│   │   ├── conversation_relation.service.ts # 会话关系 CRUD
│   │   └── recommend_questions.service.ts # 推荐问题生成（SSE 流式）
│   ├── llm/
│   │   ├── llm_communicator.ts            # LLM 通信器（streamEvents 透传 + stream SSE + text 非流式）
│   │   └── mcp.ts                         # MCP 客户端（SSE/Streamable/Post 三种传输）
│   ├── config/
│   │   ├── env.ts                         # 环境变量读取（envId 优先级、apiKey 等）
│   │   ├── bot_config.ts                  # bot-config.yaml 解析（单例模式）
│   │   └── bot_info.ts                    # BotInfo 类定义
│   ├── types/
│   │   ├── context.ts                     # CloudbaseContext / RequestContext / ChatHistoryItem / SSESender
│   │   ├── entities.ts                    # ChatHistoryEntity / ConversationRelationEntity / 语音类型
│   │   └── bot_context.ts                 # BotContext 基类
│   └── utils/
│       ├── constants.ts                   # 常量（数据源名称、角色、触发源等）
│       ├── helpers.ts                     # 工具函数（randomId、safeJsonParse 等）
│       └── tcb.ts                         # 云开发工具（文件信息获取、MCP 图片处理、envId/README 替换）
├── bot-config.yaml                        # Bot 配置文件
├── Dockerfile                             # 多阶段构建（node:20-alpine）
├── scf_bootstrap                          # 云函数启动脚本
├── package.json                           # 依赖管理（ESM 模块）
├── tsconfig.json                          # TypeScript 编译配置
├── .env.example                           # 环境变量模板
└── README.md                              # 本文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

运行时依赖：

| 依赖                           | 用途                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| `@ag-ui/client`                | AG-UI 协议类型定义（AbstractAgent、EventType 等）                      |
| `@cloudbase/agent-server`      | AG-UI Express 路由自动注册（createExpressRoutes）                      |
| `@cloudbase/agent-adapter-llm` | LLM 消息转换（convertMessagesToOpenAI）与流处理（processOpenAIStream） |
| `@cloudbase/agent-adapter-wx`  | 微信消息适配器（WeChatAgent、createWxMessageHandler）                  |
| `@cloudbase/aiagent-framework` | AI 工具调用框架（联网搜索、知识库检索、数据模型查询、语音转换等）      |
| `@cloudbase/mcp`               | MCP PostClientTransport                                                |
| `@cloudbase/node-sdk`          | 云开发 Node SDK（文件上传/下载/临时 URL）                              |
| `@modelcontextprotocol/sdk`    | MCP 标准 SDK（SSE/Streamable 传输）                                    |
| `@dotenvx/dotenvx`             | 环境变量加载                                                           |
| `express`                      | HTTP 服务框架 (v5)                                                     |
| `openai`                       | OpenAI SDK v6（LLM 调用）                                             |
| `jwt-decode`                   | JWT 解码（用户认证）                                                   |
| `js-yaml`                      | YAML 配置文件解析                                                      |
| `nanoid`                       | 随机 ID 生成                                                           |
| `rxjs`                         | 响应式编程库（版本锁定 7.8.1，通过 overrides）                         |

### 2. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑项目根目录的 `.env` 文件：

```env
# 云开发环境 ID（本地开发必需）
CLOUDBASE_ENV_ID=your-env-id

# 云开发 API Key（用于调用云开发 OpenAPI）
CLOUDBASE_APIKEY=your-api-key
```

> **注意**：`.env` 文件位于项目根目录（与 `package.json` 同级），代码通过 `path.join(process.cwd(), '.env')` 加载。

### 3. 配置 Bot

编辑项目根目录的 `bot-config.yaml` 文件，主要配置项：

| 配置项                    | 说明                                            | 默认值        |
| ------------------------- | ----------------------------------------------- | ------------- |
| `name`                    | Bot 名称                                        | 云开发 Agent  |
| `model`                   | 模型标识                                        | deepseek-v3.2 |
| `baseURL`                 | 大模型请求地址（支持 `{{envId}}` 模板变量）     | -             |
| `agentSetting`            | 人设和回复约束（支持 `{{README.md}}` 模板变量） | -             |
| `introduction`            | 描述                                            | -             |
| `welcomeMessage`          | 欢迎语                                          | -             |
| `initQuestions`           | 初始化问题列表                                  | []            |
| `isNeedRecommend`         | 是否开启推荐问题                                | false         |
| `knowledgeBase`           | 知识库 ID 列表                                  | []            |
| `databaseModel`           | 数据模型表列表                                  | []            |
| `searchNetworkEnable`     | 联网搜索开关                                    | false         |
| `searchFileEnable`        | 文件对话开关                                    | false         |
| `mcpServerList`           | MCP 服务列表（每项含 name/url/transport/tools）  | []            |
| `voiceSettings`           | 语音输入输出配置（含 enable/inputType/outputType） | enable: false, inputType: "16k_zh", outputType: 501007 |
| `multiConversationEnable` | 多会话模式                                      | false         |

### 4. 启动开发服务器

```bash
# 开发模式（热重载）
npm run dev

# 编译后运行
npm run build
npm start
```

启动成功后输出：

```
Cloudbase Agent server is running on port 9000
Environment: your-env-id
Bot Name: 云开发 Agent
```

### 5. 测试接口

```bash
# 健康检查
curl http://localhost:9000/healthz

# Bot 信息
curl http://localhost:9000/v1/aibot/bots/my-bot

# AG-UI 对话（SSE 流式响应）
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"id":"msg-1","role":"user","content":"你好"}],
    "threadId": "test-thread",
    "runId": "test-run"
  }'
```

## API 接口

所有业务路由均支持双前缀：`/` 和 `/v1/aibot/bots/:botId`。

### AG-UI 标准接口（createExpressRoutes 自动注册）

| 路由                | 方法 | 描述                           |
| ------------------- | ---- | ------------------------------ |
| `/send-message`     | POST | AG-UI 对话接口（SSE 流式响应） |
| `/chat/completions` | POST | OpenAI 兼容接口                |
| `/agui`             | POST | AG-UI 原生接口                 |

### 业务路由

| 路由                          | 方法     | 描述                                                                  |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `/`                           | GET      | 获取 Bot 信息（名称、模型、配置等）                                   |
| `/healthz`                    | GET      | 健康检查                                                              |
| `/wx-send-message`            | POST     | 微信消息处理（WeChatAgent）                                           |
| `/records`                    | GET      | 查询历史聊天记录（query: sort, pageSize, pageNumber, conversationId） |
| `/recommend-questions`        | POST     | 获取推荐问题（SSE 流式响应，body: msg, history）                      |
| `/conversation`               | POST     | 创建会话（body: userId, title）                                       |
| `/conversation`               | GET      | 查询会话列表（query: limit, offset, userId）                          |
| `/conversation/:conversation` | PATCH    | 更新会话标题（body: title）                                           |
| `/conversation/:conversation` | DELETE   | 删除会话                                                              |
| `/speech-to-text`             | POST     | 语音转文字 ASR（body: url, voiceFormat, engSerViceType）              |
| `/text-to-speech`             | POST     | 文字转语音 TTS（body: text, voiceType）                               |
| `/text-to-speech`             | GET      | 查询 TTS 结果（query: taskId）                                        |
| `/feedback`                   | POST/GET | 用户反馈（stub，返回 NotImplemented 错误）                            |

## 环境变量

| 变量名             | 本地开发 | 云托管      | 描述                        |
| ------------------ | -------- | ----------- | --------------------------- |
| `CLOUDBASE_ENV_ID` | ✅ 必需  | ❌ 自动注入 | 云开发环境 ID               |
| `CLOUDBASE_APIKEY` | ✅ 必需  | ✅ 需配置   | 云开发 API Key              |
| `CBR_ENV_ID`       | -        | 自动注入    | 云托管环境 ID（优先级最高） |
| `SCF_NAMESPACE`    | -        | 自动注入    | 云函数环境 ID               |

> **环境 ID 获取优先级**：`CBR_ENV_ID` > `SCF_NAMESPACE` > `CLOUDBASE_ENV_ID`
>
> **服务端口**：固定 9000

## AG-UI 协议

### 请求格式

```typescript
interface SendMessageRequest {
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  threadId?: string;
  runId?: string;
  state?: Record<string, unknown>;
  forwardedProps?: {
    /** 用户消息，覆盖从 messages 中提取的最后一条消息 */
    msg?: string;
    /** 文件列表 */
    files?: string[];
    /** 是否启用联网搜索 */
    searchEnable?: boolean;
    /** 是否使用 SSE 模式 */
    needSSE?: boolean;
    /** 聊天历史，覆盖从 messages 中提取的历史 */
    history?: Array<{ role: string; content: string }>;
  };
}
```

### AG-UI 响应事件

CloudbaseAgent 通过 AG-UI 通道零翻译透传 `processOpenAIStream` 产出的全部事件。典型事件序列：

**普通对话：**

```
RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT* → TEXT_MESSAGE_END → RUN_FINISHED
```

**深度思考模型（如 DeepSeek-R1）：**

```
RUN_STARTED → THINKING_START → THINKING_TEXT_MESSAGE_START → THINKING_TEXT_MESSAGE_CONTENT* → THINKING_TEXT_MESSAGE_END → THINKING_END → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT* → TEXT_MESSAGE_END → RUN_FINISHED
```

**工具调用：**

```
RUN_STARTED → TOOL_CALL_START → TOOL_CALL_ARGS* → TOOL_CALL_END → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT* → TEXT_MESSAGE_END → RUN_FINISHED
```

```typescript
// 运行生命周期
{ type: "RUN_STARTED", runId: string, threadId: string }
{ type: "RUN_FINISHED" }
{ type: "RUN_ERROR", message: string }                                         // 错误时

// 文本消息
{ type: "TEXT_MESSAGE_START", messageId: string, role: "assistant" }
{ type: "TEXT_MESSAGE_CONTENT", messageId: string, delta: string }             // 增量文本
{ type: "TEXT_MESSAGE_END", messageId: string }

// 深度思考（Thinking）
{ type: "THINKING_START" }
{ type: "THINKING_TEXT_MESSAGE_START", messageId: string }
{ type: "THINKING_TEXT_MESSAGE_CONTENT", messageId: string, delta: string }    // 推理增量文本
{ type: "THINKING_TEXT_MESSAGE_END", messageId: string }
{ type: "THINKING_END" }

// 工具调用
{ type: "TOOL_CALL_START", toolCallId: string, toolCallName: string }
{ type: "TOOL_CALL_ARGS", toolCallId: string, delta: string }                 // 工具参数增量
{ type: "TOOL_CALL_END", toolCallId: string }
```

> **架构说明**：AG-UI 通道（`CloudbaseAgent.runAsync()`）对 `processOpenAIStream` 产出的所有事件**零翻译透传**，所有事件类型（包括 `THINKING_*` 系列和 `TOOL_CALL_*` 系列）完整传递给前端。SSE 直出通道（`LLMCommunicator.stream()`）则将 AG-UI 事件翻译为 `IMsgResult` 格式（`type: "text"`、`"reasoning"`、`"thinking_start"` 等）输出。

## 核心模块说明

### CloudbaseAgent (`agent.ts`)

继承 `@ag-ui/client` 的 `AbstractAgent`，实现 `run()` 方法返回 `Observable<BaseEvent>`。内部流程：

1. 从 `input.state` 中刷新请求上下文（userId 等），确保与中间件注入的信息一致
2. 发送 `RUN_STARTED`
3. 从 `forwardedProps` 提取可覆盖字段（`msg`、`files`、`searchEnable`、`needSSE`、`history`），回退到从 `messages` 中提取
4. 通过 `ChatContextService.prepareMessages()` 组装消息上下文（系统提示词 + 历史 + 工具结果 + 用户消息）
5. 通过 `MainChatService.beforeStream()` 创建聊天记录
6. 调用 `LLMCommunicator.streamEvents()` 获取 AG-UI 事件流，**零翻译透传**所有事件给 subscriber
7. 仅拦截 `TEXT_MESSAGE_CONTENT` 累积 `fullContent`（用于数据库保存），和 `RUN_ERROR` 终止流
8. 通过 `MainChatService.afterStream()` 保存回复内容
9. 发送 `RUN_FINISHED`

### LLMCommunicator (`llm/llm_communicator.ts`)

LLM 通信器，提供三种调用方式：

- **`streamEvents()`**：AG-UI 事件透传通道（`AsyncGenerator<BaseEvent>`），直接 yield `processOpenAIStream` 产出的所有原始 AG-UI 事件，不做任何翻译或过滤。所有事件类型（包括 `THINKING_*`、`TOOL_CALL_*`、`TEXT_MESSAGE_*` 等）完整透传。错误时产出 `RUN_ERROR` 事件。
- **`stream()`**：SSE 直出通道，将 AG-UI 事件翻译为 `IMsgResult` 格式（`type: "text"`、`"reasoning"`、`"thinking_start"`、`"thinking_text_start"`、`"thinking_text_end"`、`"thinking_end"`、`"tool_call_start"`、`"tool_call_args"`、`"tool_call_end"`、`"finish"`、`"error"`），通过 SSESender 输出 `data: {...}\n\n` 格式
- **`text()`**：非流式调用，通过回调函数返回完整响应

三种方式均使用 `@cloudbase/agent-adapter-llm` 的 `convertMessagesToOpenAI` 转换消息格式，流式方式使用 `processOpenAIStream` 处理 OpenAI stream。

### McpClient (`llm/mcp.ts`)

支持三种 MCP 传输协议：

- **SSE** (`SSEClientTransport`) - 通过 `@modelcontextprotocol/sdk`
- **Streamable HTTP** (`StreamableHTTPClientTransport`) - 通过 `@modelcontextprotocol/sdk`
- **Post** (`PostClientTransport`) - 通过 `@cloudbase/mcp`

MCP URL 限制为 `*.service.tcloudbase.com` 或 `*.api.tcloudbasegateway.com` 域名。工具结果中的 base64 图片会自动上传到云存储并替换为临时 URL。

### ChatContextService (`services/chat_context.service.ts`)

组装发送给 LLM 的完整消息列表：

1. 整理历史记录（确保 user/assistant 成对出现，且 content 不为空，限制 20 条以内）
2. 若无传入历史，从数据库查询最近 10 条记录（按 `HISTORY_PAGE_SIZE`），取最近 24 小时内的对话
3. 调用工具服务获取背景知识（知识库检索、联网搜索、文件搜索、数据模型查询）
4. 生成包含角色设定和提示注入防护的系统消息
5. 数据模型查询优先级最高：若配置了 `databaseModel`，优先使用数据模型结果；否则并发执行知识库、联网搜索、文件搜索

### 数据存储

通过云开发数据模型 OpenAPI（`https://{envId}.api.tcloudbasegateway.com/v1/model/prod/{datasource}/create|update|list|delete`）使用 `fetch` 操作两张数据表：

- `ai_bot_chat_history_5hobd2b` — 聊天历史记录
- `conversation_relation_5hobd2b` — 会话关系

> **注意**：数据操作使用 `fetch` 直接调用 OpenAPI，而非 `@cloudbase/node-sdk`。`@cloudbase/node-sdk` 仅用于文件上传/下载/临时 URL 相关操作。

## 部署

### 云托管部署

项目已包含 Dockerfile（多阶段构建）：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# 运行阶段
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm i --production
COPY --from=builder /app/dist ./dist
COPY bot-config.yaml ./
COPY README.md ./
ENV NODE_ENV=production
EXPOSE 9000
CMD ["node", "dist/index.js"]
```

部署步骤：

```bash
tcb cloudrunfunction deploy
```

### 云托管环境变量配置

在云托管控制台配置：

- `CLOUDBASE_APIKEY` — 云开发 API Key

云托管环境自动注入：

- `CBR_ENV_ID` — 环境 ID（优先级最高）

### 云函数部署

项目包含 `scf_bootstrap` 启动脚本：

```sh
#!/bin/sh
node dist/index.js
```

## 注意事项

1. **ESM 模块**：项目使用 ESM（`"type": "module"`），所有导入需包含 `.js` 后缀
2. **rxjs 版本锁定**：通过 package.json `overrides` 锁定 `rxjs: "7.8.1"`，避免与 `@ag-ui/client` 的类型冲突
3. **Bot 配置模板变量**：`bot-config.yaml` 中的 `baseURL` 支持 `{{envId}}` 模板变量，`agentSetting` 支持 `{{README.md}}` 模板变量（自动替换为 README 文件内容）
4. **Node.js 版本**：要求 >= 18.0.0（package.json engines 配置）
5. **端口固定**：服务端口固定为 9000

## 故障排除

### TypeScript 编译错误

如果遇到 rxjs 类型冲突：

1. 确保 `package.json` 中 `overrides` 配置了 `rxjs: "7.8.1"`
2. 确保 `tsconfig.json` 中启用了 `skipLibCheck: true`

### 环境变量未加载

1. 确认 `.env` 文件位于项目根目录（与 `package.json` 同级）
2. 环境变量名称正确：`CLOUDBASE_ENV_ID`（不是 `TCB_ENV_ID`）
3. 在云托管/云函数环境中，`CBR_ENV_ID` 或 `SCF_NAMESPACE` 会自动注入

### Bot 配置未加载

1. `bot-config.yaml` 是否存在于项目根目录
2. YAML 格式是否正确（可用 `js-yaml` 验证）

## 接口使用示例

### 创建会话

```bash
curl -X POST http://localhost:9000/conversation \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "title": "新对话"}'
# {"conversationId":"abc123..."}
```

### 查询会话列表

```bash
curl "http://localhost:9000/conversation?limit=10&offset=0&userId=user-123"
# {"conversationList":[...],"total":5}
```

### 更新会话标题

```bash
curl -X PATCH http://localhost:9000/conversation/conv-123 \
  -H "Content-Type: application/json" \
  -d '{"title": "新标题"}'
# {"success":true}
```

### 删除会话

```bash
curl -X DELETE http://localhost:9000/conversation/conv-123
# {"success":true}
```

### 查询聊天记录

```bash
curl "http://localhost:9000/records?conversationId=conv-123&pageSize=20&pageNumber=1&sort=desc"
# {"recordList":[...],"total":100}
```

### 语音转文字

```bash
curl -X POST http://localhost:9000/speech-to-text \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/audio.mp3", "voiceFormat": "mp3", "engSerViceType": "16k_zh"}'
# {"result":"识别出的文字内容..."}
```

### 文字转语音

```bash
curl -X POST http://localhost:9000/text-to-speech \
  -H "Content-Type: application/json" \
  -d '{"text": "要转换为语音的文字", "voiceType": "101001"}'
# {"taskId":"task-xxx"}
```

### 获取推荐问题（SSE）

```bash
curl -X POST http://localhost:9000/recommend-questions \
  -H "Content-Type: application/json" \
  -d '{"msg": "用户最新消息", "history": [{"role": "user", "content": "之前的问题"}, {"role": "assistant", "content": "之前的回答"}]}'
# SSE 流式响应
```

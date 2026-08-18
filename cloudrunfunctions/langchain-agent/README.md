# LangChain Agent 云开发智能体模板

本项目基于腾讯云开发函数型 Agent 模板，采用 [LangChain.js](https://js.langchain.com/) 框架，基于云开发 AI 能力接口，完成了一个支持三大核心工具能力的多模态智能体（Agent）实现。

## 🚀 主要特性

### 三大核心工具能力

1. **🌐 联网搜索工具 (search_network)**
   - 实时信息检索，获取最新新闻、股价、天气等
   - 基于云开发 AI 联网检索能力

2. **🗄️ 数据库检索工具 (search_database)**
   - 基于云开发数据模型，实现业务数据查询

3. **📚 知识库检索工具 (search_knowledge)**
   - 基于云开发 AI 知识库进行检索
   - 业务文档、产品手册、政策流程查询
   - 专业领域知识和最佳实践检索
   - 自定义知识内容管理

### 技术特性

- **🔄 流式输出**：支持 SSE 流式返回，实时响应
- **🤖 智能工具选择**：基于用户输入自动选择合适的工具组合
- **📱 多模态支持**：支持处理图片、文档等多种输入
- **🛠️ 灵活配置**：支持动态配置模型、工具启用状态
- **🔍 详细调试**：完整的调试信息输出，便于问题排查

## 🎯 工具能力演示

### 联网搜索示例
```
用户："今天深圳的天气怎么样？"
AI：自动调用 search_network 工具获取实时天气信息
```

### 数据库查询示例
```
用户："查询某某表最近一周的订单统计"
AI：自动调用 search_database 工具进行数据统计分析
```

### 知识库检索示例
```
用户："公司的请假流程是什么？"
AI：自动调用 search_knowledge 工具查询内部政策文档
```

## ⚙️ 环境变量配置

本项目提供了环境变量模板 `.env.template`，将其重命名为 `.env.development` 后进行编辑。

### 必需变量
- `CLOUDBASE_ENV_ID`：云开发环境 ID（仅本地调试使用）
- `CLOUDBASE_API_KEY`：云开发 API Key（用于大模型对话，仅本地调试用）[前往云开发平台获取](https://tcb.cloud.tencent.com/dev#/env/apikey)

### 可选配置
- 数据库配置：根据具体数据库类型配置相应环境变量
- 知识库配置：根据知识库服务配置相应参数

## 📋 项目架构

```
├── src/
│   ├── index.ts                    # 云函数入口文件，初始化 Agent 和工具
│   ├── agent.ts                    # Agent 包装器，处理消息和流式输出
│   └── lib/                        # 核心库文件
│       ├── agent_config.ts         # Agent 配置管理，读取 YAML 配置
│       ├── agent_context.ts        # Agent 上下文管理
│       ├── agent_info.ts           # Agent 信息定义
│       ├── agent_tools.ts          # 工具生成和管理
│       ├── chat_tool.service.ts    # 工具服务实现（四大核心工具）
│       ├── tcb.ts                  # 腾讯云开发相关工具函数
│       └── utils.ts                # 通用工具函数
├── agent-config.yaml               # Agent 配置文件
├── cloudbase-functions.json        # 云函数配置
├── package.json                    # 项目依赖配置
├── tsconfig.json                   # TypeScript 配置
└── README.md                       # 项目说明文档
```

### 核心模块说明

#### 🔧 入口模块 (`index.ts`)
- **功能**：云函数入口点，负责初始化整个 Agent 系统
- **职责**：
  - 创建 Agent 包装器实例
  - 初始化 DeepSeek LLM 模型
  - 生成并绑定工具到 Agent
  - 启动 BotRunner 处理请求

#### 🤖 Agent 核心 (`agent.ts`)
- **功能**：Agent 包装器，实现 IBot 接口
- **职责**：
  - 处理用户消息（支持文本和文件）
  - 管理对话流程和工具调用
  - 实现流式输出 (SSE)
  - 多模态内容处理（图片、文档等）

#### 🛠️ 工具系统 (`lib/agent_tools.ts` + `lib/chat_tool.service.ts`)
- **功能**：四大核心工具的实现和管理
- **工具类型**：
  - `search_network`：联网搜索工具
  - `search_file`：文件/图片解析工具  
  - `search_database`：数据库检索工具
  - `search_knowledge`：知识库检索工具

#### ⚙️ 配置管理 (`lib/agent_config.ts`)
- **功能**：读取和管理 `agent-config.yaml` 配置
- **配置项**：模型设置、工具开关、知识库绑定等

#### 🔗 云开发集成 (`lib/tcb.ts`)
- **功能**：腾讯云开发平台集成工具
- **职责**：环境 ID 获取、API 基础 URL 构建、访问令牌管理

#### 🔄 上下文管理 (`lib/agent_context.ts` + `lib/agent_info.ts`)
- **功能**：Agent 运行时状态和信息管理
- **包含**：配置信息、Agent 实例、运行状态等

## 🔧 快速开始

### 1. 安装依赖
```shell
npm install
```

### 2. 配置环境变量（本地调试用）
```shell
cp .env.template .env.development
# 编辑 .env.development 填入必要的环境变量
```

### 3. 配置 Agent Config

#### agent-config.yaml 说明 (示例如下)

```yaml
# Agent 名称
name: 智能小助手
# Agent 模型标识
model: deepseek-v3-function-call
# Agent 设定
agentSetting: 你什么都知道，无论用户问你什么问题，你都能输出长篇大论，滔滔不绝。
# Agent 介绍
introduction: 你什么都知道，无论用户问你什么问题，你都能输出长篇大论，滔滔不绝。
# Agent 欢迎语
welcomeMessage: 你什么都知道，无论用户问你什么问题，你都能输出长篇大论，滔滔不绝。
# Agent 头像
avatar: ''
# Agent 初始化问题配置
initQuestions:
  - 你好，请介绍一下你自己。
  - 你好，你能帮我回答什么问题?
# Agent 开启推荐问题功能
isNeedRecommend: true
# Agent 绑定知识库
knowledgeBase: ['知识库ID']
# Agent 绑定数据模型
databaseModel: ['数据模型英文标识']
# Agent 开启联网搜送功能
searchNetworkEnable: true
# Agent 开启文件对话功能
searchFileEnable: true

```

### 4. 本地调试
```shell
npm run dev
```

### 5. 如何调用  Agent 服务

调用云托管部署的 Agent 服务：

```sh
curl --location 'http://{envID}.api.tcloudbasegateway.com/v1/aibot/bots/{botID}/send-message'  \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data '{
    "msg": "今日天气",
    "searchEnable": true
}'
```

调用本地 Agent 服务：

```sh
curl --location 'http://{envID}.api.tcloudbasegateway.com/v1/aibot/bots/{botID}/send-message' --connect-to '{envId}.api.tcloudbasegateway.com:80:127.0.0.1:3000'  \
--header 'Accept: text/event-stream' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer <token>' \
--data '{
    "msg": "今日深圳天气",
    "searchEnable": true
}'
```

通过 `--connect-to` 参数可以将请求转发到本地 Agent 服务。

参数说明：

* `{envID}`：云开发环境 ID
* `{botID}`：Agent 智能体 ID，本地开发时可以任意指定

### 6. 自定义 Tool 开发示例

**基于 Tavily API 实现联网搜索 Tool**

```Typescript
import { TavilySearch } from "@langchain/tavily";

const searchTool = new TavilySearch({
   maxResults: 5,
   topic: "general",
});
```

**基于腾讯混元向量化能力实现基于云开发 FAQ 的 RAG Tool**

```Typescript
import { DynamicTool } from "langchain/tools";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { TencentHunyuanEmbeddings } from "@langchain/community/embeddings/tencent_hunyuan";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

async getRetrieverTool() {
   const embeddings = new TencentHunyuanEmbeddings();
   const loader = new CheerioWebBaseLoader(
   "https://docs.cloudbase.net/ai/FAQ"
   );
   const docs = await loader.load();
   console.log('docs', docs)
   const splitter = new RecursiveCharacterTextSplitter({
   chunkSize: 500,
   chunkOverlap: 100,
   });
   const documents = await splitter.splitDocuments(docs);
   console.log('documents', documents)
   const vectorStore = await MemoryVectorStore.fromDocuments(
   documents,
   embeddings
   );
   const retriever = vectorStore.asRetriever();

   const retrieverTool = new DynamicTool({
   name: "tcb_faq_rag",
   description: "在云开发AI FAQ 知识库中检索相关内容",
   func: async (input: string) => {
      const docs = await retriever.getRelevantDocuments(input);
      console.log('retrieve docs', docs)
      return docs.map(d => d.pageContent).join("\n");
   },
   });
   return retrieverTool;
}
```

## 📦 部署上线

```shell
npm run build
npm run deploy
```

根据输出提示填入云开发环境 ID、服务名即可完成部署。

## 🔗 相关资源

- [LangChain.js 官方文档](https://js.langchain.com/docs/)
- [腾讯云开发 AI+](https://docs.cloudbase.net/ai/introduce)
- [函数型云托管](https://docs.cloudbase.net/cbrf/intro)

## 📝 更新日志

- **v2.0.0**: 支持云开发 AI 四大核心工具（文件/图片解析，联网搜索， 知识库检索， 数据模型检索）
- **v1.0.0**: 基础 RAG 检索和联网搜索功能

# n8n Python Agent 快速开始

本文档介绍如何将一个基于 n8n Webhook 的 AI Agent 应用部署到 CloudBase HTTP 云函数。该项目使用 `cloudbase-agent-server` 作为应用程序运行框架。

我们这里使用 `python3.10` 进行开发。

## 第1步: 编写基础应用

创建名为 `n8n-python` 的新项目，并进入此目录中:

```bash
mkdir n8n-python
cd n8n-python
```

创建虚拟环境

```bash
python3.10 -m venv venv
source venv/bin/activate  # 激活虚拟环境
```

安装依赖组件

```bash
python -m pip install -r ./requirements.txt \
    --platform manylinux_2_17_x86_64 \
    --target ./env \
    --python-version 3.10 \
    --only-binary=:all: \
    --upgrade
```

## 第2步：配置环境变量

创建 `.env` 文件（参考 `.env.example`）:

```bash
N8N_WEBHOOK_URL=http://localhost:5678/webhook/xxx/chat
```

**环境变量说明**：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `N8N_WEBHOOK_URL` | ✅ | n8n Webhook URL，来自 "When chat message received" 节点 |
| `AUTO_TRACES_STDOUT` | ❌ | 设为 `false` 或 `0` 关闭可观测性（默认启用） |

**注意**: 部署到 SCF 时，需要在云函数控制台配置这些环境变量。

## 第3步：编写代码

### `agent.py` - Agent 实现

```python
def build_n8n_agent(webhook_url=None, timeout=None):
    """构建 n8n Agent 实例，从参数或环境变量读取 Webhook URL"""
    final_webhook_url = webhook_url or os.environ.get("N8N_WEBHOOK_URL")

    agent = N8nAgent(
        name="agentic_chat",
        description="A conversational chatbot agent powered by n8n workflow",
        webhook_url=final_webhook_url,
        timeout=timeout,
        # 如果 n8n webhook 启用了 Basic Auth：
        # headers={"Authorization": f"Basic {base64.b64encode(b'user:pass').decode()}"},
    )
    return agent
```

### `app.py` - 应用入口

```python
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.observability.server import ConsoleTraceConfig
from agent import build_n8n_agent

agent = build_n8n_agent()
observability = ConsoleTraceConfig() if is_observability_enabled() else None
AgentServiceApp(observability=observability).run(lambda: {"agent": agent})
```

**服务端口**: 默认使用 9000 端口（由 `cloudbase-agent-server` 管理）。

### `scf_bootstrap` - SCF 启动脚本

```bash
#!/bin/bash
export PYTHONPATH="./env:$PYTHONPATH"
/var/lang/python310/bin/python3 -u app.py
```

**说明**:
- 设置 `PYTHONPATH` 指向 `./env` 目录，让 Python 能找到依赖包
- 所有通过 pip 安装的依赖包都存放在 `env/` 目录中

## 第4步：测试和使用

服务启动后会自动注册两种 endpoint 格式，方便不同场景使用：

### 短 URL（本地开发推荐）
```
POST http://localhost:9000/send-message
```

### 长 URL（云函数部署格式）
```
POST http://localhost:9000/v1/aibot/bots/{agent_id}/send-message
```

**说明**：
- 本地开发时推荐使用短 URL，更简洁方便
- `{agent_id}` 参数当前为保留字段，可以传任意值
- 两种格式功能完全相同，只是路径不同

### 请求示例

```bash
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "run-456",
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```


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

如果 n8n Webhook 节点启用了认证，需要在构建 Agent 时通过 `headers` 参数传入对应的认证信息。

推荐使用 **Basic Auth**，在 n8n 中最易配置：

```python
import base64
credentials = base64.b64encode(b"user:pass").decode()
agent = N8nAgent(
    name="agentic_chat",
    description="A conversational chatbot agent powered by n8n workflow",
    webhook_url=final_webhook_url,
    headers={"Authorization": f"Basic {credentials}"},
)
```

**n8n 配置**：Webhook 节点 → Authentication → **Basic Auth** → 填入用户名和密码。

> n8n 也支持 Header Auth 和 JWT Auth，同样通过 `headers` 参数传入对应的 HTTP Header 即可。

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

在 `app.py` 中修改 `AgentServiceApp` 的初始化：

```python
from cloudbase_agent.observability.server import ConsoleTraceConfig

# 显式传入可观测性配置
AgentServiceApp(observability=ConsoleTraceConfig()).run(lambda: {"agent": agent})
```

### 关闭可观测性

如需关闭可观测性功能，可采用以下任一方式：

**方式一：环境变量**

```bash
AUTO_TRACES_STDOUT=false
```

**方式二：代码配置**

```python
AgentServiceApp(observability=None).run(lambda: {"agent": agent})
```

### 输出格式

启用后，traces 将以 JSON 格式输出到 stdout，每行一个 span，便于使用 `grep`、`jq` 等工具分析。

## 第5步：管理项目依赖

### 打包部署

将项目文件打成 zip 包（包含本地依赖）:

```bash
zip -r n8n-python.zip .
```

### 上传部署

1. 选择 **HTTP 云函数**
2. Python 运行时选择 **3.10**
3. 上传 zip 包
4. 在控制台配置环境变量：
   - `N8N_WEBHOOK_URL`
5. 点击部署

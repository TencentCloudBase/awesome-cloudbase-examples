# Coze Agent 转 AGUI 协议部署指南

本项目用于将 **Coze 平台上编辑好的 Agent** 转换为 **AGUI 协议**，并部署到 CloudBase HTTP 云函数。

## 📦 项目说明

本项目已经完整实现了 Coze Agent 到 AGUI 协议的转换，包括：

- ✅ **`agent.py`** - 完整的 Coze Agent 实现（基于 `CozeAgent` 封装）
- ✅ **`app.py`** - 应用入口和服务启动（基于 `AgentServiceApp`）
- ✅ **`auth.py`** - JWT 认证辅助模块（从 Authorization header 提取 user_id）
- ✅ **`scf_bootstrap`** - SCF 云函数启动脚本
- ✅ 支持 Coze Chat V3 API
- ✅ 支持流式响应（streaming）
- ✅ 支持推理内容（reasoning content）
- ✅ 自动修复事件 ID，确保正确的追踪
- ✅ JWT 认证集成（自动从 JWT token 提取 user_id）
- ✅ 智能错误处理（conversation_id 格式错误自动重试）

**你只需要配置环境变量并部署即可使用！**

---

## 🚀 快速开始

### 第1步：准备环境

创建虚拟环境并安装依赖：

```bash
# 创建虚拟环境
python3.10 -m venv venv
source venv/bin/activate  # 激活虚拟环境

# 安装依赖到 env 目录（用于 SCF 部署）
python -m pip install -r ./requirements.txt \
    --platform manylinux_2_17_x86_64 \
    --target ./env \
    --python-version 3.10 \
    --only-binary=:all: \
    --upgrade
```

### 第2步：配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
COZE_API_TOKEN=your_api_token_here
COZE_BOT_ID=your_bot_id_here
```

**环境变量说明**：

| 变量名 | 说明 | 是否必填 |
|--------|------|----------|
| `COZE_API_TOKEN` | Coze 平台的 API Token | ✅ 必填 |
| `COZE_BOT_ID` | Coze 平台的 Bot ID | ✅ 必填 |
| `COZE_API_BASE` | Coze API 基础 URL（默认: https://api.coze.cn） | ⭕ 可选 |

**动态 User ID（每请求用户身份）**：

Adapter 支持每个请求使用不同的 `user_id`，允许多个用户使用同一个 agent 实例。这在多租户场景中特别有用，网关可以认证用户并传递其身份。

**注意**：
- 网关从 Authorization header（JWT）的 `sub` 字段提取 `user_id` 并写入 `forwarded_props.user_id`
- **安全优先级**：网关解密的 `user_id`（可信）会覆盖客户端提供的 `user_id`（可能伪造）
- 如果 JWT 的 `sub` 字段为空，Coze SDK 会报错（因为 `user_id` 是必填项）
- `user_id` 必须通过 `forwarded_props.user_id` 在请求中传递，不支持环境变量配置

**JWT 认证示例**：

示例代码中已包含完整的 JWT 解析逻辑：

1. **`auth.py`** - JWT 认证辅助模块：
   - `extract_user_id_from_jwt(token)` - 从 JWT token 中提取 user_id
   - `extract_user_id_from_request(http_context)` - 从 HTTP 请求的 Authorization header 提取 user_id
   - 自动解析 JWT payload，从 `sub` 字段提取用户身份
   - 支持 base64url 解码和 padding 处理
   - 包含完整的错误处理和日志记录

2. **`agent.py`** - JWT 请求预处理器：
   - `create_jwt_request_preprocessor()` - 创建 JWT 认证预处理器
   - 自动从 Authorization header 提取 user_id
   - 将 user_id 写入 `request.forwarded_props.user_id`，供 Coze SDK 使用

**使用方式**：

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_coze_agent, create_jwt_request_preprocessor

agent = build_coze_agent()
AgentServiceApp().run(
    lambda: {"agent": agent},
    request_preprocessor=create_jwt_request_preprocessor(),
)
```

**JWT Token 格式要求**：
- Authorization header 格式：`Bearer <token>`
- JWT payload 必须包含 `sub` 字段（标准 JWT claim，用于用户标识）
- 如果 `sub` 字段为空或缺失，会记录警告日志，Coze SDK 会报错（因为 user_id 是必填项）

**示例：网关在认证后传递 user_id**

```json
{
  "messages": [...],
  "forwarded_props": {
    "user_id": "user_12345"  // 网关传递已认证的 user_id
  }
}
```

**最佳实践**：
- 网关应从 `access_token` 中提取 `user_id`（例如，JWT claims、OAuth token）
- 网关通过 `forwarded_props.user_id` 传递 `user_id`
- Adapter 自动使用提供的 `user_id` 进行 Coze API 调用
- `user_id` 必须在每个请求中通过 `forwarded_props.user_id` 提供

**Coze 自定义用户变量**：

如需传递自定义用户变量（用于 Coze 工作流/对话流的开始节点），请通过客户端请求的 `forwarded_props.parameters` 动态传递。`forwarded_props.parameters` 会直接透传给 Coze 的 `parameters` 字段。

示例请求：
```json
{
  "messages": [...],
  "forwarded_props": {
    "parameters": {
      "user": [{"user_id": "123456", "user_name": "张三"}]
  }
}
```

更多参数请参考 [Coze API 文档](https://www.coze.cn/open/docs/developer_guides/chat_v3)

### 第3步：本地测试（可选）

```bash
# 运行应用
python app.py

# 服务将在 9000 端口启动
# 访问 http://localhost:9000 测试
```

### 第4步：部署到 CloudBase

#### 打包项目

```bash
zip -r coze-python.zip .
```

#### 上传部署

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择 **HTTP 云函数**
3. Python 运行时选择 **3.10**
4. 上传 `coze-python.zip`
5. 在控制台配置环境变量：
   - `COZE_API_TOKEN`（必填）
   - `COZE_BOT_ID`（必填）
   - `COZE_API_BASE`（可选，默认 https://api.coze.cn）
6. 点击 **部署**

---

## 📁 项目结构

```
coze-python/
├── agent.py              # ✅ 已实现：Coze Agent 封装 + JWT 请求预处理器
├── app.py                # ✅ 已实现：应用入口
├── auth.py               # ✅ 已实现：JWT 认证辅助模块
├── scf_bootstrap         # ✅ 已实现：SCF 启动脚本
├── requirements.txt      # 依赖列表
├── .env.example          # 环境变量示例
├── .env                  # 环境变量配置（需创建）
└── env/                  # 依赖包目录（自动生成）
```

---

## 🔧 核心实现说明

### `agent.py` - Coze Agent 实现

本文件已经完整实现了 Coze Agent 的封装，包含两个核心功能：

**1. `build_coze_agent()` - 构建 Coze Agent 实例**

```python
from cloudbase_agent.coze import CozeAgent
import os

def build_coze_agent():
    """构建 Coze Agent 实例，自动从环境变量读取配置"""
    return CozeAgent(
        name="agentic_chat",
        description="A conversational chatbot agent",
        api_token=os.environ.get("COZE_API_TOKEN"),
        bot_id=os.environ.get("COZE_BOT_ID"),
        base_url=os.environ.get("COZE_API_BASE"),
        fix_event_ids=True,
    )
```

**2. `create_jwt_request_preprocessor()` - JWT 认证预处理器**

```python
from auth import extract_user_id_from_request

def create_jwt_request_preprocessor():
    """创建 JWT 认证预处理器，从 Authorization header 提取 user_id"""
    def jwt_preprocessor(request, http_context):
        user_id = extract_user_id_from_request(http_context)
        if user_id:
            if not request.forwarded_props:
                request.forwarded_props = {}
            request.forwarded_props["user_id"] = user_id
    return jwt_preprocessor
```

### `auth.py` - JWT 认证辅助模块

本文件提供了完整的 JWT 认证功能：

**核心函数**：

1. **`extract_user_id_from_jwt(token)`** - 从 JWT token 提取 user_id
   - 解析 JWT 格式（header.payload.signature）
   - 解码 base64url 编码的 payload
   - 从 `sub` 字段提取用户身份
   - 包含完整的错误处理和日志记录

2. **`extract_user_id_from_request(http_context)`** - 从 HTTP 请求提取 user_id
   - 从 Authorization header 读取 Bearer token
   - 调用 `extract_user_id_from_jwt()` 解析 token
   - 返回 user_id 或 None（如果解析失败）

**特性**：
- ✅ 支持标准 JWT 格式解析
- ✅ 自动处理 base64url padding
- ✅ 完整的错误处理和日志记录
- ✅ 从标准 JWT claim `sub` 字段提取用户身份

### `app.py` - 应用入口

本文件已经完整实现了服务启动逻辑，包含 JWT 认证集成：

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_coze_agent, create_jwt_request_preprocessor

agent = build_coze_agent()
AgentServiceApp().run(
    lambda: {"agent": agent},
    request_preprocessor=create_jwt_request_preprocessor(),
)
```

**服务端口**：默认 9000（由 `cloudbase_agent.server` 管理）

**JWT 认证**：通过 `request_preprocessor` 参数自动启用，从 Authorization header 提取 user_id

### `scf_bootstrap` - SCF 启动脚本

本文件已经配置好 SCF 云函数的启动逻辑：

```bash
#!/bin/bash
export PYTHONPATH="./env:$PYTHONPATH"
/var/lang/python310/bin/python3 -u app.py
```

---

## 🎯 使用场景

1. **Coze 平台 Agent 迁移**：将 Coze 平台上编辑好的 Agent 快速部署到 CloudBase
2. **AGUI 协议转换**：自动将 Coze API 响应转换为 AGUI 协议格式
3. **多端接入**：通过 AGUI 协议，可以接入 Web、小程序、App 等多端应用

---

## 🔄 会话管理（Thread ID 行为）

Coze Adapter 会自动管理 `conversation_id` 和 AGUI `thread_id` 的映射：

### 工作流程

1. **首次对话**：
   - 客户端传入任意 `thread_id`（如 `"my-chat-123"`）
   - Adapter 尝试将其作为 Coze `conversation_id` 使用
   - 如果格式无效（非 int64 格式），自动重试不传 `conversation_id`
   - Coze 创建新会话并返回 `conversation_id`（如 `"7597422570669998080"`）
   - 所有 AGUI 事件（`RUN_STARTED`、`RUN_FINISHED` 等）使用 Coze 返回的 ID 作为 `thread_id`
   - **messageId 同步更新**：当获取到实际的 `conversation_id` 时，所有消息的 `messageId` 会自动更新为 `{actual_thread_id}:{run_id}` 格式

2. **后续对话**：
   - 客户端使用上一轮响应中的 `thread_id`（即 Coze 的 `conversation_id`）
   - Adapter 直接使用该 ID 继续 Coze 会话

### 错误处理策略

Adapter 实现了智能的错误处理机制，遵循业界最佳实践：

**自动重试（兜底创建新会话）**：
- ✅ **4000 + 格式错误**：`conversation_id` 格式无效（非 int64 或范围错误）
  - 原因：格式明显无效，可能是客户端传入了非 Coze ID 格式的字符串，应该兜底

**直接报错（不重试）**：
- ❌ **4101 + 权限错误**：`conversation_id` 无权限访问
  - 原因：可能是其他用户的 conversation_id，不应静默创建新会话，应明确报错
- ❌ **4200 + 资源不存在**：`conversation_id` 不存在
  - 原因：用户可能传错、会话被删除或属于其他环境，应明确告知错误

**设计理由**：
- 🔒 **安全性**：防止尝试访问其他用户的 conversation_id
- 👤 **用户体验**：当用户传错 conversation_id 时，应该明确告知错误，而不是静默创建新会话
- 📚 **符合最佳实践**：仅对格式错误（400）进行重试，权限和资源不存在错误直接失败

### 客户端示例

```javascript
// 首次对话
const response1 = await chat({
  thread_id: "any-string",  // 可以是任意字符串
  messages: [{ role: "user", content: "你好" }]
});
// 响应事件中 thread_id 会变成 Coze 的 conversation_id
// 如：RUN_FINISHED { thread_id: "7597422570669998080" }

// 后续对话 - 使用响应中的 thread_id
const response2 = await chat({
  thread_id: "7597422570669998080",  // 使用 Coze 返回的 ID
  messages: [{ role: "user", content: "继续聊" }]
});
```

---

## ⚠️ 注意事项

1. **API Token 和 Bot ID**：
   - 确保在 Coze 平台创建了对应的 Bot
   - 从 Coze 控制台获取正确的 API Token 和 Bot ID
   - `user_id` 需要通过请求中的 `forwarded_props.user_id` 传递

2. **自定义用户变量**：
   - Coze 的自定义用户变量（用于工作流/对话流开始节点）应通过客户端请求动态传递
   - 使用 `forwarded_props.parameters` 传递，会透传给 Coze 的 `parameters` 字段
   - 参考：[Coze 自定义参数赋值文档](https://www.coze.cn/open/docs/developer_guides/chat_v3)

3. **依赖安装**：
   - 使用 `--target ./env` 将依赖安装到 `env/` 目录
   - SCF 部署时会自动加载 `env/` 目录中的依赖

4. **端口配置**：
   - 服务默认运行在 9000 端口
   - 由 `cloudbase-agent-server` 自动管理

---

## 📚 相关文档

- [Coze 平台文档](https://www.coze.com/docs)
- [AGUI 协议规范](https://github.com/ag-ui-protocol/ag-ui)
- [CloudBase 云函数文档](https://cloud.tencent.com/document/product/876)

---

## 🆘 常见问题

**Q: 如何获取 Coze Bot ID？**
A: 登录 Coze 平台，在 Bot 设置页面可以找到 Bot ID。

**Q: 部署后无法访问？**
A: 检查环境变量是否正确配置，特别是 `COZE_API_TOKEN` 和 `COZE_BOT_ID`。确保每个请求都通过 `forwarded_props.user_id` 传递 `user_id`。

**Q: 如何传递 Coze 自定义用户变量？**
A: 通过客户端请求的 `forwarded_props.parameters` 动态传递，它会透传给 Coze 的 `parameters`：
```json
{
  "forwarded_props": {
    "parameters": {
      "user": [{"user_id": "123", "user_name": "test"}]
    }
  }
}
```

**Q: 支持哪些 Coze API 功能？**
A: 支持 Coze Chat V3 API 的所有功能，包括流式响应和推理内容。


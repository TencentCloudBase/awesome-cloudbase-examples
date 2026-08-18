# Dify Agent 转 AGUI 协议部署指南

本项目用于将 **Dify 平台上创建的应用** 转换为 **AGUI 协议**，并部署到 CloudBase HTTP 云函数或 Cloud Run。

## 📦 项目说明

本项目已经完整实现了 Dify Agent 到 AGUI 协议的转换，包括：

- ✅ **`agent.py`** - 完整的 Dify Agent 实现（基于 `DifyAgent` 封装）
- ✅ **`app.py`** - 应用入口和服务启动（基于 `AgentServiceApp`）
- ✅ **`auth.py`** - JWT 认证辅助模块（从 Authorization header 提取 user_id）
- ✅ **`scf_bootstrap`** - SCF 云函数启动脚本
- ✅ **`Dockerfile`** - 生产级容器化部署配置，便于在云环境或本地通过 Docker 直接运行本项目。
- ✅ 支持 Dify Chat API
- ✅ 支持流式响应（streaming）和阻塞响应（blocking）
- ✅ 支持 Agent 模式工具调用（agent_thought 事件）
- ✅ 自动修复事件 ID，确保正确的追踪
- ✅ JWT 认证集成（自动从 JWT token 提取 user_id）
- ✅ 智能错误处理（conversation_id 格式错误自动重试）
- ✅ **严格模式**：只接受 user 角色消息，避免语义不一致

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
DIFY_API_KEY=your_api_key_here
```

**环境变量说明**：

| 变量名 | 说明 | 是否必填 |
|--------|------|----------|
| `DIFY_API_KEY` | Dify 平台的 API Key | ✅ 必填 |
| `DIFY_API_BASE` | Dify API 基础 URL（默认: https://api.dify.ai/v1） | ⭕ 可选 |

**动态 User 标识符（每请求用户身份）**：

Adapter 支持每个请求使用不同的 `user` 标识符，允许多个用户使用同一个 agent 实例。这在多租户场景中特别有用，网关可以认证用户并传递其身份。

**注意**：
- 网关从 Authorization header（JWT）的 `sub` 字段提取 `user_id` 并写入 `forwarded_props.user`
- **安全优先级**：网关解密的 `user_id`（可信）会覆盖客户端提供的 `user`（可能伪造）
- 如果 JWT 的 `sub` 字段为空，Dify API 会报错（因为 `user` 是必填项）
- `user` 必须通过 `forwarded_props.user` 在请求中传递，不支持环境变量配置

**JWT 认证示例**：

示例代码中已包含完整的 JWT 解析与 middleware 逻辑：

1. **`auth.py`** - JWT 认证辅助模块：
   - `decode_jwt(token)` - 解码 JWT，返回 (user_id from `sub`, full payload)
   - `extract_user_id_from_jwt(token)` - 从 JWT token 中提取 user_id
   - 支持 base64url 解码和 padding 处理，包含完整错误处理和日志

2. **`agent.py`** - JWT 中间件：
   - `jwt_middleware(input_data, request)` - 从 Authorization Bearer 解码 JWT，注入 `forwarded_props.user` 与 `state.__request_context__.user`
   - 通过 `app.use(jwt_middleware)` 注册，与 server 的 middleware 链一致

**使用方式**：

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_dify_agent, jwt_middleware

agent = build_dify_agent()
app = AgentServiceApp()
app.use(jwt_middleware)
app.run(lambda: {"agent": agent})
```

**JWT Token 格式要求**：
- Authorization header 格式：`Bearer <token>`
- JWT payload 必须包含 `sub` 字段（标准 JWT claim，用于用户标识）
- 如果 `sub` 字段为空或缺失，会记录警告日志，Dify API 会报错（因为 user 是必填项）

**示例：网关在认证后传递 user**

```json
{
  "messages": [...],
  "forwarded_props": {
    "user": "user_12345"  // 网关传递已认证的 user
  }
}
```

**最佳实践**：
- 网关应从 `access_token` 中提取 `user_id`（例如，JWT claims、OAuth token）
- 网关通过 `forwarded_props.user` 传递 `user_id`
- Adapter 自动使用提供的 `user` 进行 Dify API 调用
- `user` 必须在每个请求中通过 `forwarded_props.user` 提供

**Dify 应用变量（inputs）**：

如需传递应用变量（用于 Dify 应用的变量节点），请通过客户端请求的 `forwarded_props.inputs` 动态传递。`forwarded_props.inputs` 会直接透传给 Dify 的 `inputs` 字段。

示例请求：
```json
{
  "messages": [...],
  "forwarded_props": {
    "inputs": {
      "city": "Beijing",
      "temperature": "25"
    }
  }
}
```

更多参数请参考 [Dify API 文档](https://docs.dify.ai/api-reference/chat/send-chat-message)

### 第3步：本地测试（可选）

```bash
# 运行应用
python app.py

# 服务将在 9000 端口启动
# 访问 http://localhost:9000 测试
```

也可使用 `./dev-test.sh` 进行本地测试。

### 第4步：部署到 CloudBase

#### 打包项目

```bash
zip -r dify-python.zip .
```

或使用构建脚本：`./build-scf.sh`

#### 上传部署

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择 **HTTP 云函数**
3. Python 运行时选择 **3.10**
4. 上传 `dify-python.zip`（或脚本生成的包）
5. 在控制台配置环境变量：
   - `DIFY_API_KEY`（必填）
   - `DIFY_API_BASE`（可选，默认 https://api.dify.ai/v1）
6. 设置启动文件为 `scf_bootstrap`
7. 点击 **部署**

### 第5步：部署到 Cloud Run（可选）

#### 打包项目

```bash
./build-cloudrun.sh
```

或手动打包：`zip -r dify-cloudrun.zip .`

#### 部署

1. 上传 `dify-cloudrun.zip` 到 Cloud Run
2. 使用提供的 `Dockerfile` 构建容器
3. 在 Cloud Run 设置中配置环境变量
4. 部署服务

---

## 📁 项目结构

```
dify-python/
├── agent.py              # ✅ 已实现：Dify Agent 封装 + JWT 请求预处理器
├── app.py                # ✅ 已实现：应用入口
├── auth.py               # ✅ 已实现：JWT 认证辅助模块
├── scf_bootstrap         # ✅ 已实现：SCF 启动脚本
├── requirements.txt      # 依赖列表
├── Dockerfile            # ✅ 已实现：容器化部署配置
├── .env.example          # 环境变量示例
├── .env                  # 环境变量配置（需创建）
└── env/                  # 依赖包目录（自动生成）
```

---

## 🔧 核心实现说明

### `agent.py` - Dify Agent 实现

本文件已经完整实现了 Dify Agent 的封装，包含两个核心功能：

**1. `build_dify_agent()` - 构建 Dify Agent 实例**

```python
from cloudbase_agent.dify import DifyAgent
import os

def build_dify_agent():
    """构建 Dify Agent 实例，自动从环境变量读取配置"""
    return DifyAgent(
        name="agentic_chat",
        description="A conversational chatbot agent",
        api_key=os.environ.get("DIFY_API_KEY"),
        base_url=os.environ.get("DIFY_API_BASE", "https://api.dify.ai/v1"),
        fix_event_ids=True,
    )
```

**2. `jwt_middleware(input_data, request)` - JWT 认证中间件**

通过 `app.use(jwt_middleware)` 注册。从 Authorization Bearer 解码 JWT，注入：
- `forwarded_props.user`（来自 JWT `sub`），供 Dify API 使用
- `state.__request_context__.user` = `{"id": user_id, "jwt": payload}`，供工作流使用

开启 DEBUG 日志后可看到：`JWT middleware: Injected state.__request_context__.user (id=xxx)` 以确认 state 已注入。

### `auth.py` - JWT 认证辅助模块

本文件提供 JWT 解码与 user_id 提取：

**核心函数**：

1. **`decode_jwt(token)`** - 解码 JWT，返回 `(user_id, payload)`
   - 解析 JWT 格式（header.payload.signature），解码 base64url payload
   - 从 `sub` 提取 user_id，并返回完整 payload 字典供 state 使用

2. **`extract_user_id_from_jwt(token)`** - 从 JWT token 提取 user_id
   - 内部调用 `decode_jwt()`，返回 user_id 或 None

**特性**：
- ✅ 支持标准 JWT 格式解析
- ✅ 自动处理 base64url padding
- ✅ 完整的错误处理和日志记录
- ✅ 从标准 JWT claim `sub` 字段提取用户身份

### `app.py` - 应用入口

本文件已经完整实现了服务启动逻辑，包含 JWT 认证集成：

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_dify_agent, jwt_middleware

agent = build_dify_agent()
app = AgentServiceApp()
app.use(jwt_middleware)
app.run(lambda: {"agent": agent})
```

**服务端口**：默认 9000（由 `cloudbase_agent.server` 管理）

**JWT 认证**：通过 `app.use(jwt_middleware)` 注册，从 Authorization Bearer 解码 JWT 并注入 `forwarded_props.user` 与 `state.__request_context__.user`

### `scf_bootstrap` - SCF 启动脚本

本文件已经配置好 SCF 云函数的启动逻辑：

```bash
#!/bin/bash
export PYTHONPATH="./env:$PYTHONPATH"
/var/lang/python310/bin/python3 -u app.py
```

---

## 🎯 使用场景

1. **Dify 平台应用迁移**：将 Dify 平台上创建的应用快速部署到 CloudBase
2. **AGUI 协议转换**：自动将 Dify API 响应转换为 AGUI 协议格式
3. **多端接入**：通过 AGUI 协议，可以接入 Web、小程序、App 等多端应用

---

## 🔄 会话管理（Thread ID 行为）

Dify Adapter 会自动管理 `conversation_id` 和 AGUI `thread_id` 的映射：

### 工作流程

1. **首次对话**：
   - 客户端传入任意 `thread_id`（如 `"my-chat-123"`）
   - Adapter 尝试将其作为 Dify `conversation_id` 使用
   - 如果格式无效，自动重试不传 `conversation_id`
   - Dify 创建新会话并返回 `conversation_id`（如 `"45701982-8118-4bc5-8e9b-64562b4555f2"`）
   - 所有 AGUI 事件（`RUN_STARTED`、`RUN_FINISHED` 等）使用 Dify 返回的 ID 作为 `thread_id`
   - **messageId 同步更新**：当获取到实际的 `conversation_id` 时，所有消息的 `messageId` 会自动更新为 `{actual_thread_id}:{run_id}` 格式

2. **后续对话**：
   - 客户端使用上一轮响应中的 `thread_id`（即 Dify 的 `conversation_id`）
   - Adapter 直接使用该 ID 继续 Dify 会话

### 错误处理策略

Adapter 实现了智能的错误处理机制，遵循业界最佳实践：

**自动重试（兜底创建新会话）**：
- ✅ **400 + invalid_param**：`conversation_id` 格式无效
  - 原因：格式明显无效，可能是客户端传入了非 Dify ID 格式的字符串，应该兜底

**直接报错（不重试）**：
- ❌ **404**：`conversation_id` 不存在
  - 原因：用户可能传错、会话被删除或属于其他环境，应明确告知错误
- ❌ **401/403**：认证/权限错误
  - 原因：API Key 无效或权限不足，应直接报错

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
// 响应事件中 thread_id 会变成 Dify 的 conversation_id
// 如：RUN_FINISHED { thread_id: "45701982-8118-4bc5-8e9b-64562b4555f2" }

// 后续对话 - 使用响应中的 thread_id
const response2 = await chat({
  thread_id: "45701982-8118-4bc5-8e9b-64562b4555f2",  // 使用 Dify 返回的 ID
  messages: [{ role: "user", content: "继续聊" }]
});
```

---

## ⚠️ 注意事项

1. **API Key**：
   - 确保在 Dify Studio 创建了对应的应用
   - 从 Dify 控制台获取正确的 API Key
   - `user` 需要通过请求中的 `forwarded_props.user` 传递

2. **应用变量（inputs）**：
   - Dify 的应用变量（用于应用变量节点）应通过客户端请求动态传递
   - 使用 `forwarded_props.inputs` 传递，会透传给 Dify 的 `inputs` 字段
   - 参考：[Dify API 文档](https://docs.dify.ai/api-reference/chat/send-chat-message)

3. **依赖安装**：
   - 使用 `--target ./env` 将依赖安装到 `env/` 目录
   - SCF 部署时会自动加载 `env/` 目录中的依赖

4. **端口配置**：
   - 服务默认运行在 9000 端口
   - 由 `cloudbase_agent.server` 自动管理

5. **严格模式**：
   - Dify adapter 采用**严格模式**：本次请求 messages 中只允许包含 `user` 角色消息
   - 如果请求中包含 `assistant`、`system`、`tool`、`developer` 等非 user role，adapter 会直接返回 `RUN_ERROR`
   - 这避免了“悄悄丢上下文导致语义不一致”的问题

---

## 📚 相关文档

- [Dify 平台文档](https://docs.dify.ai)
- [AGUI 协议规范](https://github.com/ag-ui-protocol/ag-ui)
- [CloudBase 云函数文档](https://cloud.tencent.com/document/product/876)

---

## 🆘 常见问题

**Q: 如何获取 Dify API Key？**
A: 登录 Dify Studio，在应用设置 -> API Access 页面可以找到 API Key。

**Q: 部署后无法访问？**
A: 检查环境变量是否正确配置，特别是 `DIFY_API_KEY`。确保每个请求都通过 `forwarded_props.user` 传递 `user` 标识符。

**Q: 如何传递 Dify 应用变量？**
A: 通过客户端请求的 `forwarded_props.inputs` 动态传递，它会透传给 Dify 的 `inputs` 字段：
```json
{
  "forwarded_props": {
    "inputs": {
      "city": "Beijing",
      "temperature": "25"
    }
  }
}
```

**Q: 支持哪些 Dify API 功能？**
A: 支持 Dify Chat API 的所有功能，包括流式响应、阻塞响应、Agent 模式工具调用等。

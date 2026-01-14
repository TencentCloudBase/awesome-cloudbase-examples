# Coze Agent 转 AGUI 协议部署指南

本项目用于将 **Coze 平台上编辑好的 Agent** 转换为 **AGUI 协议**，并部署到 CloudBase HTTP 云函数。

## 📦 项目说明

本项目已经完整实现了 Coze Agent 到 AGUI 协议的转换，包括：

- ✅ **`agent.py`** - 完整的 Coze Agent 实现（基于 `CozeAgent` 封装）
- ✅ **`app.py`** - 应用入口和服务启动（基于 `AgentServiceApp`）
- ✅ **`scf_bootstrap`** - SCF 云函数启动脚本
- ✅ 支持 Coze Chat V3 API
- ✅ 支持流式响应（streaming）
- ✅ 支持推理内容（reasoning content）
- ✅ 自动修复事件 ID，确保正确的追踪

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
COZE_USER_ID=your_user_id_here
COZE_PARAMETERS={"temperature": 0.7, "max_tokens": 2000}
```

**环境变量说明**：

| 变量名 | 说明 | 是否必填 |
|--------|------|----------|
| `COZE_API_TOKEN` | Coze 平台的 API Token | ✅ 必填 |
| `COZE_BOT_ID` | Coze 平台的 Bot ID | ✅ 必填 |
| `COZE_USER_ID` | Coze 平台的 User ID | ✅ 必填 |
| `COZE_PARAMETERS` | Coze Chat API 的自定义参数（JSON 格式） | ⭕ 可选 |

**`COZE_PARAMETERS` 支持的参数**：
- `temperature`: 控制生成文本的随机性（0-1）
- `max_tokens`: 最大生成 token 数
- 更多参数请参考 [Coze API 文档](https://www.coze.com/docs)

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
   - `COZE_USER_ID`（必填）
   - `COZE_PARAMETERS`（可选）
6. 点击 **部署**

---

## 📁 项目结构

```
coze-python/
├── agent.py              # ✅ 已实现：Coze Agent 封装
├── app.py                # ✅ 已实现：应用入口
├── scf_bootstrap         # ✅ 已实现：SCF 启动脚本
├── requirements.txt      # 依赖列表
├── .env.example          # 环境变量示例
├── .env                  # 环境变量配置（需创建）
└── env/                  # 依赖包目录（自动生成）
```

---

## 🔧 核心实现说明

### `agent.py` - Coze Agent 实现

本文件已经完整实现了 Coze Agent 的封装，核心功能：

```python
def build_coze_agent(
    bot_id: Optional[str] = None,
    user_id: Optional[str] = None,
    parameters: Optional[dict] = None,
) -> CozeAgent:
    """构建 Coze Agent 实例
    
    自动从环境变量读取配置，支持参数覆盖
    """
    final_bot_id = bot_id or os.environ.get("COZE_BOT_ID")
    final_user_id = user_id or os.environ.get("COZE_USER_ID")
    
    agent = CozeAgent(
        name="agentic_chat",
        description="A conversational chatbot agent",
        bot_id=final_bot_id,
        user_id=final_user_id,
        parameters=parameters,
        fix_event_ids=True,  # 自动修复事件 ID
    )
    return agent
```

### `app.py` - 应用入口

本文件已经完整实现了服务启动逻辑：

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_coze_agent

if __name__ == "__main__":
    agent = build_coze_agent()
    AgentServiceApp().run(lambda: {"agent": agent})
```

**服务端口**：默认 9000（由 `cloudbase-agent-server` 管理）

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

## ⚠️ 注意事项

1. **API Token、Bot ID 和 User ID**：
   - 确保在 Coze 平台创建了对应的 Bot
   - 从 Coze 控制台获取正确的 API Token、Bot ID 和 User ID

2. **参数格式**：
   - `COZE_PARAMETERS` 必须是有效的 JSON 格式字符串
   - 示例：`{"temperature": 0.7, "max_tokens": 2000}`

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
A: 检查环境变量是否正确配置，特别是 `COZE_API_TOKEN`、`COZE_BOT_ID` 和 `COZE_USER_ID`。

**Q: 如何自定义参数？**
A: 通过 `COZE_PARAMETERS` 环境变量配置，格式为 JSON 字符串。

**Q: 支持哪些 Coze API 功能？**
A: 支持 Coze Chat V3 API 的所有功能，包括流式响应和推理内容。


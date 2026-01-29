# LangGraph Python Agent 快速开始

本文档介绍如何将一个基于 LangGraph 的 AI Agent 应用部署到 CloudBase HTTP 云函数。该项目使用 `cloudbase-agent-server` 作为应用程序运行框架。

我们这里使用 `python3.10` 进行开发。

## 第1步: 编写基础应用

创建名为 `langgraph-python` 的新项目，并进入此目录中:

```bash
mkdir langgraph-python
cd langgraph-python
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
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**注意**: 部署到 SCF 时，需要在云函数控制台配置这些环境变量。

## 第3步：编写代码

### `agent.py` - Agent 实现

```python
def chat_node(state, config: Optional[RunnableConfig] = None, writer=None):
    """Chat node with access to forwardedProps."""
    
    # 获取 forwardedProps 中的参数
    user_id = None
    
    if config and "configurable" in config:
        configurable = config["configurable"]
        user_id = configurable.get("user_id")
        
        print(f"🔑 User ID: {user_id}")
    
    # ... 其余 chat 逻辑
```

**说明**：`forwardedProps` 中的参数（如 `user_id`）会被注入到 LangGraph 的 `config["configurable"]` 中，可以在 chat_node 中直接访问。

### `app.py` - 应用入口

```python
from cloudbase_agent.server import AgentServiceApp
from cloudbase_agent.langgraph import LangGraphAgent
from agent import build_agentic_chat_workflow

if __name__ == "__main__":
    agent = LangGraphAgent(graph=build_agentic_chat_workflow())
    AgentServiceApp().run(lambda: {"agent": agent})
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

### 自定义 Base Path（仅本地开发）

如果需要自定义 API 路径前缀，可以在启动时指定：

```python
# 自定义 base_path
AgentServiceApp().run(
    lambda: {"agent": agent},
    base_path="/api/v2"
)
```

自定义后的 URL 格式：
```
POST http://localhost:9000/api/v2/send-message
```

**注意**：使用自定义 `base_path` 时，只会注册单一路径，不再提供长短两种格式。

### 请求示例

```bash
curl -X POST http://localhost:9000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "test-thread-123",
    "runId": "run-456", 
    "messages": [
      {"role": "user", "content": "你好"}
    ],
    "forwardedProps": {
      "user_id": "user_12345",
      "custom_field": "custom_value"
    }
  }'
```

**重要提示**：
- 每次新的用户消息应使用不同的 `message.id`，或者不传 `id` 让服务器自动生成
- 相同 `threadId` 内的消息会保持对话连续性

## 第5步：管理项目依赖

### 打包部署

将项目文件打成 zip 包（包含本地依赖）:

```bash
zip -r langgraph-python.zip .
```

### 上传部署

1. 选择 **HTTP 云函数**
2. Python 运行时选择 **3.10**
3. 上传 zip 包
4. 在控制台配置环境变量：
   - `OPENAI_API_KEY`
   - `OPENAI_BASE_URL`
   - `OPENAI_MODEL`
5. 点击部署
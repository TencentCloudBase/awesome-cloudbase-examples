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
from langgraph.graph import StateGraph, MessagesState
from langchain_openai import ChatOpenAI
import os

def chat_node(state, config=None):
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    
    if not api_key or not base_url:
        raise ValueError("Environment variables not set")
    
    chat_model = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        api_key=api_key,
        base_url=base_url,
    )
    # ... 实现 chat 逻辑
```

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

## 第4步：管理项目依赖

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
   - `OPENAI_MODEL`（可选）
5. 点击部署
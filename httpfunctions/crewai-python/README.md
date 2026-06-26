# CrewAI Python Agent 快速开始

本文档介绍如何将一个基于 CrewAI Flow 的 AI Agent 应用部署到 CloudBase HTTP 云函数。该项目使用 `cloudbase-agent-server` 作为应用程序运行框架。

我们这里使用 `python3.10` 进行开发。

## 第1步: 编写基础应用

创建名为 `crewai-python` 的新项目，并进入此目录中:

```bash
mkdir crewai-python
cd crewai-python
```

创建虚拟环境

```bash
python3.10 -m venv venv
source venv/bin/activate  # 激活虚拟环境
```

## 第2步：安装依赖组件

由于 CrewAI 包含大量 C/Rust 扩展模块（如 numpy, pydantic-core, rpds-py 等），需要使用专门的安装脚本确保所有二进制包与 SCF Linux 环境兼容。

运行安装脚本：

```bash
./install_hybrid.sh
```

**关键参数说明**：
- `--platform manylinux_2_17_x86_64`：强制下载 Linux x86_64 平台的二进制包
- `--python-version 3.10`：指定 Python 版本
- `--only-binary=:all:`：只接受二进制包（.whl），不使用源码编译
- `--no-deps`：不自动安装依赖（避免下载错误平台的包）

## 第3步：配置环境变量

创建 `.env` 文件（参考 `.env.example`）:

```bash
# 模型名称（支持 OpenAI 兼容的 API）
OPENAI_MODEL=your_model_name

# API Base URL
# 通义千问: https://dashscope.aliyuncs.com/compatible-mode/v1
# 智谱 AI: https://open.bigmodel.cn/api/paas/v4
# OpenAI: https://api.openai.com/v1
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# API Key (必填)
OPENAI_API_KEY=your_api_key_here

```

**注意**: 部署到 SCF 时，需要在云函数控制台配置这些环境变量。

## 第4步：编写代码

### `agent.py` - Agent 实现

```python
import os
import sys
import pysqlite3
from pathlib import Path

# 配置 SCF 环境
os.environ["HOME"] = "/tmp"
os.environ["CREWAI_STORAGE_DIR"] = "/tmp"

# 创建必需目录
credentials_dir = Path("/tmp/.local/share/crewai/credentials")
credentials_dir.mkdir(parents=True, exist_ok=True)

# 替换 sqlite3 为 pysqlite3（SCF 兼容性）
sys.modules['sqlite3'] = pysqlite3

from crewai.flow import Flow, start, persist
from litellm import acompletion
from cloudbase_agent.crewai import CrewAIAgent
from cloudbase_agent.crewai.converters import CopilotKitState

@persist()
class AgenticChatFlow(Flow[CopilotKitState]):
    """会话式 AI Agent 流程"""

    @start()
    async def chat(self) -> None:
        """处理聊天消息并生成流式响应"""
        system_prompt = "You are a helpful assistant."
        
        model_name = os.getenv("OPENAI_MODEL", "qwen-plus")
        base_url = os.getenv("OPENAI_BASE_URL")
        api_key = os.getenv("OPENAI_API_KEY")
        
        # 调用 LLM
        stream = await acompletion(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                *self.state.messages
            ],
            base_url=base_url,
            api_key=api_key,
            custom_llm_provider="openai",
        )
        
        # 处理响应并更新状态
        message = stream.choices[0].message
        self.state.messages.append(message)

def build_chat_workflow() -> AgenticChatFlow:
    """构建聊天工作流实例"""
    return AgenticChatFlow()
```

**关键点**：
1. **环境配置**：设置 `HOME` 和 `CREWAI_STORAGE_DIR` 为 `/tmp`，因为 SCF 只有 `/tmp` 可写
2. **LiteLLM**：支持多种 LLM 提供商的统一接口

### `app.py` - 应用入口

```python
from cloudbase_agent.server import AgentServiceApp
from agent import build_chat_workflow, CrewAIAgent

if __name__ == "__main__":
    agent = CrewAIAgent(flow=build_chat_workflow())
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

## 第5步：管理项目依赖

### requirements.txt

```txt
fastapi==0.125.0
cloudbase-agent-server==0.1.11
cloudbase-agent-core==0.1.11
cloudbase-agent-crewai==0.1.11
crewai==1.7.2
pysqlite3-binary==0.5.4
litellm==1.50.0
openai==1.83.0
python-dotenv==1.1.1
```

### 打包部署

将项目文件打成 zip 包（包含本地依赖）:

```bash
zip -r crewai-python.zip . -x "*.git*" -x "*venv*" -x "*.DS_Store"
```

**注意**：确保包含 `env/` 目录

### 上传部署

1. 选择 **HTTP 云函数**
2. Python 运行时选择 **3.10**
3. 上传 zip 包
4. 在控制台配置环境变量：
   - `OPENAI_API_KEY`（必填）
   - `OPENAI_BASE_URL`（必填）
   - `OPENAI_MODEL`（必填）
5. 点击部署
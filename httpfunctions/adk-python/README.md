# ADK Python Agent 快速开始

本项目演示如何将基于 Google ADK 的 AI Agent 部署到 CloudBase HTTP 云函数。使用 `cloudbase-agent-server` 框架，通过 LiteLLM 支持多种 OpenAI 兼容模型。

## 项目结构

```
adk-python/
├── .env.example           # 环境变量示例
├── README.md              # 本文档
├── requirements.txt       # 依赖声明
├── scf_bootstrap          # SCF 启动脚本
├── agent.py               # Agent 实现
├── app.py                 # 应用入口
└── env/                   # 依赖目录
```

## 第1步：手动安装依赖

使用 Python 3.10 安装依赖到 `./env` 目录：

```bash
python3.10 -m pip install -r ./requirements.txt \
    --platform manylinux_2_17_x86_64 \
    --target ./env \
    --python-version 3.10 \
    --only-binary=:all: \
    --upgrade
```

## 第2步：配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 3 个必需变量：

```bash
OPENAI_MODEL=model-name
OPENAI_BASE_URL=your_base_url
OPENAI_API_KEY=your_api_key_here
```

## 第3步：本地运行测试

```bash
python3 app.py
```

## 第4步：打包部署到 SCF

### 创建部署包

```bash
zip -r adk-python.zip . \
    -x "*.git*" \
    -x "*__pycache__*" \
    -x "*.pyc" \
    -x "venv/*" \
    -x ".env" \
    -x "*.backup"
```

### 部署到 CloudBase

1. 登录 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择 **HTTP 云函数**
3. 创建新函数：
   - 运行时：**Python 3.10**
   - 上传方式：本地 ZIP 包
   - 上传 `adk-python.zip`
4. 配置环境变量（3 个必需变量）：
   - `OPENAI_MODEL`: 模型名称
   - `OPENAI_BASE_URL`: API 端点
   - `OPENAI_API_KEY`: 你的 API Key
5. 点击部署

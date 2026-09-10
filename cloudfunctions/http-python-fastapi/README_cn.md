# http-python-fastapi

使用 [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn 的 CloudBase HTTP 函数模板。

## 结构

```text
http-python-fastapi/
├── scf_bootstrap       # 启动脚本，使用 uvicorn 监听 9000 端口
├── app.py              # FastAPI 应用源码
├── requirements.txt    # 依赖列表
└── README_cn.md / README_en.md
```

## 本地运行

```bash
pip install -r requirements.txt

# 方式一：直接用 python 启动（带 reload，仅本地开发）
python3 app.py

# 方式二：用 uvicorn（与生产环境一致）
uvicorn app:app --host 0.0.0.0 --port 9000 --workers 2

# 然后访问 http://localhost:9000
#         http://localhost:9000/json
#         http://localhost:9000/docs   # FastAPI 自动生成的交互式文档
#         curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## 部署到 CloudBase HTTP 函数

1. 进入 CloudBase 控制台 → 云函数 → 新建。
2. 函数类型选择「HTTP 触发函数」。
3. 运行环境选择 `Python`。
4. 上传整个目录（CloudBase 会按 `requirements.txt` 安装依赖）。


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（已声明 `type: http`、`path: /http-python-fastapi`），安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` (with `type: http`, `path: /http-python-fastapi`). After installing & logging in to the [CloudBase CLI](https://docs.cloudbase.net/cli/intro), deploy in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 访问 HTTP 服务 / Hit the HTTP endpoint
#    部署后，函数的访问域名形如：
#    After deployment, the function URL looks like:
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-python-fastapi/

# 4. 查看日志 / Tail logs
tcb fn log http-python-fastapi -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

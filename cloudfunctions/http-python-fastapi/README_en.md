# http-python-fastapi

A CloudBase HTTP function template powered by [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn.

## Structure

```text
http-python-fastapi/
├── scf_bootstrap       # Bootstrap script that uses uvicorn to listen on port 9000
├── app.py              # FastAPI application source
├── requirements.txt    # Dependencies
└── README_cn.md / README_en.md
```

## Run locally

```bash
pip install -r requirements.txt

# Option 1: run with python (auto-reload, dev only)
python3 app.py

# Option 2: run with uvicorn (matches production)
uvicorn app:app --host 0.0.0.0 --port 9000 --workers 2

# Then open http://localhost:9000
#          http://localhost:9000/json
#          http://localhost:9000/docs   # FastAPI auto-generated interactive docs
#          curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## Deploy to CloudBase HTTP Function

1. Open the CloudBase console → Cloud Functions → Create.
2. Choose "HTTP-triggered function".
3. Pick `Python` as the runtime.
4. Upload the whole folder (CloudBase installs deps from `requirements.txt`).


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

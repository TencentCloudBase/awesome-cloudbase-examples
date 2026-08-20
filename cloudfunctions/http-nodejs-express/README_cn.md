# http-nodejs-express

使用 [Express](https://expressjs.com/) 框架的 CloudBase HTTP 函数模板。

## 结构

```text
http-nodejs-express/
├── scf_bootstrap       # 启动脚本（必需）
├── index.js            # Express 应用源码
├── package.json
└── README_cn.md / README_en.md
```

## 本地运行

```bash
npm install
node index.js
# 然后访问 http://localhost:9000
#         http://localhost:9000/json
#         curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## 部署到 CloudBase HTTP 函数

1. 进入 CloudBase 控制台 → 云函数 → 新建。
2. 函数类型选择「HTTP 触发函数」。
3. 运行环境选择 `Nodejs`。
4. 上传整个目录（包含 `node_modules` 或在云端 `npm install`）。


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（已声明 `type: http`、`path: /http-nodejs-express`），安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` (with `type: http`, `path: /http-nodejs-express`). After installing & logging in to the [CloudBase CLI](https://docs.cloudbase.net/cli/intro), deploy in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 访问 HTTP 服务 / Hit the HTTP endpoint
#    部署后，函数的访问域名形如：
#    After deployment, the function URL looks like:
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-nodejs-express/

# 4. 查看日志 / Tail logs
tcb fn log http-nodejs-express -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

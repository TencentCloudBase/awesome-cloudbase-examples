# http-nodejs-helloworld

A minimal CloudBase HTTP function example written with Node.js built-in `http` module, with no third-party dependencies.

## Structure

```text
http-nodejs-helloworld/
├── scf_bootstrap       # Bootstrap script (required, container entrypoint)
├── index.js            # HTTP server source
├── package.json
└── README_cn.md / README_en.md
```

## Run locally

```bash
node index.js
# Then open http://localhost:9000
```

## Deploy to CloudBase HTTP Function

1. Go to [CloudBase Console](https://console.cloud.tencent.com/tcb) → Cloud Functions → Create.
2. Choose "HTTP-triggered function" as the function type.
3. Pick `Nodejs` as the runtime.
4. Upload the whole folder, or edit `index.js` and `scf_bootstrap` inline in the console.
5. After deployment, invoke it via the function's HTTP endpoint.


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（已声明 `type: http`、`path: /http-nodejs-helloworld`），安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` (with `type: http`, `path: /http-nodejs-helloworld`). After installing & logging in to the [CloudBase CLI](https://docs.cloudbase.net/cli/intro), deploy in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 访问 HTTP 服务 / Hit the HTTP endpoint
#    部署后，函数的访问域名形如：
#    After deployment, the function URL looks like:
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-nodejs-helloworld/

# 4. 查看日志 / Tail logs
tcb fn log http-nodejs-helloworld -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

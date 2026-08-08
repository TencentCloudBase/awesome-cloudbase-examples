# http-nodejs-helloworld

使用 Node.js 内置 `http` 模块实现的最小化 CloudBase HTTP 函数示例，无任何第三方依赖。

## 结构

```text
http-nodejs-helloworld/
├── scf_bootstrap       # 启动脚本（必需，云函数容器入口）
├── index.js            # HTTP 服务源码
├── package.json
└── README_cn.md / README_en.md
```

## 本地运行

```bash
node index.js
# 然后访问 http://localhost:9000
```

## 部署到 CloudBase HTTP 函数

1. 进入 [CloudBase 控制台](https://console.cloud.tencent.com/tcb) → 云函数 → 新建。
2. 函数类型选择「HTTP 触发函数」。
3. 运行环境选择 `Nodejs`。
4. 上传整个目录或在控制台编辑 `index.js` 与 `scf_bootstrap`。
5. 部署后通过函数访问地址即可调用。


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

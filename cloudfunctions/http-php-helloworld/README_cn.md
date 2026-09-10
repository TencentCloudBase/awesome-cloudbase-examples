# http-php-helloworld

使用 PHP 内置 web server 实现的最小化 CloudBase HTTP 函数示例，无任何第三方依赖。

## 结构

```text
http-php-helloworld/
├── scf_bootstrap       # 启动脚本，运行 php -S 0.0.0.0:9000 -t . router.php
├── router.php          # 内置 server 的路由 / 响应入口
└── README_cn.md / README_en.md
```

## 本地运行

```bash
php -S 0.0.0.0:9000 -t . router.php
# 然后访问 http://localhost:9000
```

## 部署到 CloudBase HTTP 函数

1. 进入 CloudBase 控制台 → 云函数 → 新建。
2. 函数类型选择「HTTP 触发函数」。
3. 运行环境选择 `PHP`（或 CustomRuntime）。
4. 上传整个目录。


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（`type: http`、`runtime: CustomRuntime`、`path: /http-php-helloworld`）。本函数依赖 `scf_bootstrap` 启动自定义运行时进程，由 CloudBase CLI 一键打包上传。
> 在部署前请执行 `composer install --no-dev --optimize-autoloader`，确保 `vendor/` 已存在。

This folder ships a ready-to-use `cloudbaserc.json` (`type: http`, `runtime: CustomRuntime`, `path: /http-php-helloworld`). It relies on `scf_bootstrap` to launch the custom runtime; CloudBase CLI packages and uploads everything in one go.
> Before deploying, run `composer install --no-dev --optimize-autoloader` so that `vendor/` exists.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. (按需) 先准备构建产物 / Optionally build artifacts first
#    Go:   ./build.sh
#    Java: mvn clean package && cp target/app.jar ./app.jar
#    PHP:  composer install --no-dev --optimize-autoloader

# 3. 部署 / Deploy
tcb fn deploy -e <YOUR_ENV_ID>

# 4. 访问 / Invoke via HTTP
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-php-helloworld/

# 5. 查看日志 / Tail logs
tcb fn log http-php-helloworld -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

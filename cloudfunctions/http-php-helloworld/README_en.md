# http-php-helloworld

A minimal CloudBase HTTP function example using the PHP built-in web server, with no third-party dependencies.

## Structure

```text
http-php-helloworld/
├── scf_bootstrap       # Bootstrap script that runs `php -S 0.0.0.0:9000 -t . router.php`
├── router.php          # Entry / router used by the built-in server
└── README_cn.md / README_en.md
```

## Run locally

```bash
php -S 0.0.0.0:9000 -t . router.php
# Then open http://localhost:9000
```

## Deploy to CloudBase HTTP Function

1. Open the CloudBase console → Cloud Functions → Create.
2. Choose "HTTP-triggered function".
3. Pick `PHP` (or CustomRuntime) as the runtime.
4. Upload the whole folder.


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

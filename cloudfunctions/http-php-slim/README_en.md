# http-php-slim

A CloudBase HTTP function template powered by the [Slim 4](https://www.slimframework.com/) framework.

## Structure

```text
http-php-slim/
├── scf_bootstrap       # Bootstrap: php -S 0.0.0.0:9000 -t public public/index.php
├── composer.json
├── public/index.php    # Slim application entry
└── README_cn.md / README_en.md
```

## Run locally

```bash
composer install
php -S 0.0.0.0:9000 -t public public/index.php
# Then open http://localhost:9000
#          http://localhost:9000/json
#          curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## Deploy to CloudBase HTTP Function

1. Run `composer install` locally to populate `vendor/`.
2. Upload the whole folder (including `vendor/`) to a CloudBase HTTP function.
3. Pick `PHP` (or CustomRuntime) as the runtime.


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（`type: http`、`runtime: CustomRuntime`、`path: /http-php-slim`）。本函数依赖 `scf_bootstrap` 启动自定义运行时进程，由 CloudBase CLI 一键打包上传。
> 在部署前请执行 `composer install --no-dev --optimize-autoloader`，确保 `vendor/` 已存在。

This folder ships a ready-to-use `cloudbaserc.json` (`type: http`, `runtime: CustomRuntime`, `path: /http-php-slim`). It relies on `scf_bootstrap` to launch the custom runtime; CloudBase CLI packages and uploads everything in one go.
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
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-php-slim/

# 5. 查看日志 / Tail logs
tcb fn log http-php-slim -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

# http-go-gin

A CloudBase HTTP function template powered by the [Gin](https://github.com/gin-gonic/gin) framework.

## Structure

```text
http-go-gin/
├── scf_bootstrap       # Bootstrap script that runs ./main
├── main.go             # Gin application source
├── go.mod
├── build.sh            # Build script for compiling a Linux binary locally
└── README_cn.md / README_en.md
```

## Run locally

```bash
go mod tidy
go run main.go
# Then open http://localhost:9000
#          http://localhost:9000/json
#          curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## Build + Deploy to CloudBase HTTP Function

```bash
./build.sh
# Upload the whole folder (including the `main` binary) as a CustomRuntime HTTP function.
```


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（`type: http`、`runtime: CustomRuntime`、`path: /http-go-gin`）。本函数依赖 `scf_bootstrap` 启动自定义运行时进程，由 CloudBase CLI 一键打包上传。
> 在部署前请执行 `./build.sh` 编译 Linux 二进制 `main`，部署包需要包含该二进制与 `scf_bootstrap`。

This folder ships a ready-to-use `cloudbaserc.json` (`type: http`, `runtime: CustomRuntime`, `path: /http-go-gin`). It relies on `scf_bootstrap` to launch the custom runtime; CloudBase CLI packages and uploads everything in one go.
> Before deploying, run `./build.sh` to build the Linux `main` binary. The deployment bundle must include this binary along with `scf_bootstrap`.

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
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-go-gin/

# 5. 查看日志 / Tail logs
tcb fn log http-go-gin -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

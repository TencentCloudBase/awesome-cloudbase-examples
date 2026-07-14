# http-go-gin

使用 [Gin](https://github.com/gin-gonic/gin) 框架的 CloudBase HTTP 函数模板。

## 结构

```text
http-go-gin/
├── scf_bootstrap       # 启动脚本，运行 ./main
├── main.go             # Gin 应用源码
├── go.mod
├── build.sh            # 构建脚本（用于在本地编译 Linux 二进制）
└── README_cn.md / README_en.md
```

## 本地运行

```bash
go mod tidy
go run main.go
# 然后访问 http://localhost:9000
#         http://localhost:9000/json
#         curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## 构建 + 部署到 CloudBase HTTP 函数

```bash
./build.sh
# 将整个目录（含编译产物 main）打包上传到 CustomRuntime HTTP 函数。
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

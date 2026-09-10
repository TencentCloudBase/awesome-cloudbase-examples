# http-java-springboot

A CloudBase HTTP function template powered by the [Spring Boot](https://spring.io/projects/spring-boot) framework.

## Structure

```text
http-java-springboot/
├── scf_bootstrap       # Bootstrap script that runs `java -jar app.jar`
├── pom.xml             # Maven config (uses spring-boot-maven-plugin to build a fat jar)
├── src/main/java/example/
│   ├── Application.java    # Bootstrap class
│   └── HelloController.java
├── src/main/resources/application.properties
└── README_cn.md / README_en.md
```

## Build & Run locally

```bash
mvn clean package
java -jar target/app.jar
# Then open http://localhost:9000
#          http://localhost:9000/json
#          curl -X POST http://localhost:9000/echo -H "Content-Type: application/json" -d '{"a":1}'
```

## Deploy to CloudBase HTTP Function

1. Run `mvn clean package` to produce `target/app.jar`.
2. Copy `target/app.jar` to the project root as `app.jar`, then upload it together with `scf_bootstrap`.
3. In the CloudBase console, create a new "HTTP-triggered function" with CustomRuntime as the runtime.


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json`（`type: http`、`runtime: CustomRuntime`、`path: /http-java-springboot`）。本函数依赖 `scf_bootstrap` 启动自定义运行时进程，由 CloudBase CLI 一键打包上传。
> 在部署前请执行 `mvn clean package`，并把 `target/app.jar` 复制为本目录下的 `app.jar`（`scf_bootstrap` 默认 `java -jar app.jar`）。

This folder ships a ready-to-use `cloudbaserc.json` (`type: http`, `runtime: CustomRuntime`, `path: /http-java-springboot`). It relies on `scf_bootstrap` to launch the custom runtime; CloudBase CLI packages and uploads everything in one go.
> Before deploying, run `mvn clean package` and copy `target/app.jar` to `app.jar` in this folder (the bundled `scf_bootstrap` runs `java -jar app.jar`).

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
curl https://<YOUR_ENV_ID>.service.tcloudbase.com/http-java-springboot/

# 5. 查看日志 / Tail logs
tcb fn log http-java-springboot -e <YOUR_ENV_ID>
```

> 一次性部署所有函数：在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> Deploy everything at once from the `cloudfunctions/` root: `tcb fn deploy --all -e <YOUR_ENV_ID>`.

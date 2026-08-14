---
name: cloudrun-development
description: CloudBase Run backend development rules (Function mode/Container mode). Use this skill when deploying backend services that require long connections, multi-language support, custom environments, AI agent development, or migrating existing/GitHub apps that need VPC access to MySQL/PostgreSQL/Redis. For stateless HTTP services, prefer HTTP cloud functions.
version: 2.26.0
alwaysApply: false
---

## Sibling skills (local only)

Sibling CloudBase skills ship beside this skill. Use local relative paths such as `../auth-tool-cloudbase/SKILL.md`.

If a referenced sibling skill file is missing from this environment, ask the user to install the full CloudBase plugin (or the missing skill). Do **not** HTTP-fetch remote skill or protocol markdown into the agent context.

**Cross-cutting protocols** (required before writing HTTP handlers or deploying images):
- Sensitive Runtime Data Protection: `../cloudbase-platform/references/protocols/sensitive-runtime-data-protection.md`
- Deployment Gate: `../cloudbase-platform/references/protocols/deployment-gate.md`

# CloudBase Run Development

## Activation Contract

### Use this first when

- The task is to initialize, run, deploy, inspect, or debug a CloudBase Run service.
- The request needs a long-lived HTTP service, SSE, WebSocket, custom system dependencies, or container-style deployment.
- The task is to create or run an Agent service on CloudBase Run.
- The task migrates an **existing / GitHub / third-party** backend that uses classic `DATABASE_URL` / TCP database clients.
- The service requires a **stable independent process** (long connections, custom runtime, VPC database access) — see the 「云托管 vs HTTP 云函数」 decision section below. A Dockerfile alone is **not** a strong trigger.

### Read before writing code if

- You still need to choose between Function mode and Container mode.
- The prompt mentions `queryCloudRun`, `manageCloudRun`, Dockerfile, service domains, or public/private access.
- The app depends on MySQL, PostgreSQL, Redis, or other VPC-private resources over TCP → also read `references/vpc-and-database.md`.
- You are choosing between CloudRun and HTTP cloud functions for a stateless HTTP service.

### Then also read

- Cloud functions instead of CloudRun -> `../cloud-functions/SKILL.md`
- Agent SDK and AG-UI specifics -> `../cloudbase-agent/SKILL.md`
- Web authentication for browser callers -> `../auth-web-cloudbase/SKILL.md`
- Existing app + TCP database networking -> `references/vpc-and-database.md`

### Do NOT use for

- Simple Event Function or HTTP Function workflows that fit the function model better.
- Frontend-only projects with no backend service.
- Database-schema design tasks.

### Common mistakes / gotchas

- Choosing CloudRun when the request only needs a normal cloud function.
- Forgetting to listen on the platform-provided `PORT`.
- Treating CloudRun as stateful app hosting and storing important state on local disk.
- Assuming local run is available for Container mode.
- Opening public access by default when the scenario only needs private or mini-program internal access.
- **Deploying an existing app with `DATABASE_URL` / MySQL / PostgreSQL / Redis but omitting `serverConfig.VpcConf`** — deploy appears to succeed, then runtime DB connections fail.
- Confusing `OpenAccessTypes` (how users reach the service) with `VpcConf` (how the service reaches VPC databases).
- **Deploying to an environment that has not initialized CloudRun** — `CreateCloudRunServer` on an environment with no 大租户 record silently lands in the legacy 小租户 path, creating wrong small-tenant services/versions. Always ensure the environment is initialized first (`manageCloudRun(action="initEnv")`, tcbr) before the first deploy. `manageCloudRun(action="deploy")` now blocks new-service creation on uninitialized environments with guidance.
- **Using the legacy `tcb` CloudRun API** (`CreateCloudBaseRunResource` / `DescribeCloudBaseRunResource` / `DeleteCloudBaseRunResource`) — these are deprecated 小租户 open APIs and are blocked in `callCloudApi`. CloudRun always goes through `tcbr` (`CreateCloudRunEnv` / `CreateCloudRunServer`). Query a single environment's base info / whether CloudRun is enabled with `DescribeEnvBaseInfo` (`EnvId` required) — use `manageCloudRun(action="initEnv")` to open and `queryCloudRun(action="envStatus")` to poll status; query the environment list / resource info with `DescribeCloudRunEnvs` (`EnvId` optional filter).
- **Deploying `httpbin` / request-echo images or returning `req.headers` / `process.env`** — CloudBase may inject `x-cloudbase-context` (base64 temporary credentials). Echoing it leaks account cloud access. Follow `../cloudbase-platform/references/protocols/sensitive-runtime-data-protection.md`.

### Minimal checklist

- Choose Function mode or Container mode explicitly.
- **Confirm the environment has CloudRun initialized before the first deploy** — a brand-new environment must call `CreateCloudRunEnv` (tcbr) first; never `CreateCloudRunServer` on an uninitialized environment (it falls back to the legacy 小租户 path). `manageCloudRun(action="deploy")` validates this automatically and blocks new services on uninitialized environments. When blocked, first call `manageCloudRun(action="initEnv", envId=...)` (异步开通) and poll `queryCloudRun(action="envStatus")` until `Status=normal`, or reconsider an HTTP cloud function to bypass CloudRun entirely.
- Confirm whether the service should be public, VPC-only, or mini-program internal (**ingress**).
- If the app uses TCP databases/caches, resolve and set `VpcConf` (**egress / private network**) before deploy — see `references/vpc-and-database.md`.
- Keep the service stateless and externalize durable data.
- Use absolute paths for every local project path.
- Confirm handlers never echo `x-cloudbase-context`, full headers, or credential env vars; do not deploy httpbin-style reflectors.

## Overview

Use CloudBase Run when the task needs a deployed backend service rather than a short-lived serverless function.

### 云托管 vs HTTP 云函数（按需求选，不按文件选）

> 核心原则：**HTTP 云函数优先**。只有需求真正需要云托管时才用云托管；有 `Dockerfile` 不等于必须上云托管。

**HTTP 云函数更合适（优先）：**

- 无状态 HTTP 服务，监听 `PORT`/`9000`，只做「请求进来 → 处理 → 响应」的响应式逻辑
- 短生命周期请求，无长连接需求（SSE/WebSocket 之外的普通 API、CRUD、转发）
- 不需要自定义系统依赖 / 多语言运行时，标准 runtime 足够
- 部署更快、费用更低（按请求计费，可缩容到 0）、**无需初始化云托管环境**
- 有 `Dockerfile` 但服务本质是无状态 HTTP → 优先 HTTP 云函数（HTTP Function / Custom Image HTTP Function），不必上云托管

**云托管才需要（只有以下之一才选云托管）：**

- 长连接：WebSocket、SSE 长连接、服务端推送
- 自定义系统依赖 / 任意语言运行时 / 需要稳定独立进程
- VPC 内数据库 / Redis 访问（`VpcConf` 私有网络连通）
- Agent 服务（Function mode CloudRun）
- 迁移已有 / GitHub / 第三方应用，或需要常驻进程

**决策示例：** 一个带 `Dockerfile` 的 Go/Python HTTP API，无长连接、无自定义运行时、不碰 VPC 数据库 → 选 HTTP 云函数而不是云托管；同一份代码若有 WebSocket 长连接 → 才选云托管。

### When CloudRun is a better fit

- Long connections: WebSocket, SSE, server push
- Long-running request handling or persistent service processes
- Custom runtime environments or system libraries
- Arbitrary languages or frameworks
- Stable external service endpoints with elastic scaling
- AI Agent deployment on Function mode CloudRun
- Migrating existing containerized or multi-language apps that need VPC access to databases

## Mode selection

| Dimension | Function mode | Container mode |
| --- | --- | --- |
| Best for | Fast start, Node.js service patterns, built-in framework, Agent flows | Existing containers, arbitrary runtimes, custom system dependencies |
| Port model | Framework-managed local mode, deployed service still follows platform rules | App must listen on injected `PORT` |
| Dockerfile | Not required | Required — but a Dockerfile alone does **not** mean CloudRun; first check whether the service needs long connections / custom runtime. Stateless HTTP services with a Dockerfile may fit HTTP cloud functions better. |
| Local run through tools | Supported | Not supported |
| Typical use | Streaming APIs, low-latency backend, Agent service | Custom language stack, migrated container app |

## How to use this skill (for a coding agent)

1. **Choose mode first**
   - Function mode -> quickest path for HTTP/SSE/WebSocket or Agent scenarios
   - Container mode -> use when Docker/custom runtime is a real requirement

2. **Follow mandatory runtime rules**
   - Listen on `PORT`
   - Keep the service stateless
   - Put durable data in DB/storage/cache
   - Keep dependencies and image size small
   - Respect resource ratio guidance: `Mem = 2 × CPU`

3. **Use the correct tools**
   - Read operations -> `queryCloudRun`
   - Write operations -> `manageCloudRun`
   - Delete requires explicit confirmation and `force: true`
   - Always use absolute `targetPath`

4. **Follow the deployment sequence**
   - Initialize or download code
   - For a brand-new environment, ensure CloudRun is initialized first — call `manageCloudRun(action="initEnv", envId=...)` (async, idempotent) before the first deploy; `manageCloudRun(action="deploy")` blocks new services on uninitialized environments and tells you to call `initEnv`
   - For Container mode, verify Dockerfile
   - **Scan for DB/cache dependency signals** (`DATABASE_URL`, docker-compose DB services, ORM configs)
   - If TCP DB access is required, complete the VPC checklist in `references/vpc-and-database.md` **before** deploy
   - Local run when available
   - Configure ingress access model **and** egress `VpcConf` when needed
   - Deploy and verify detail output + DB connectivity

## Tool routing

### Read operations

- `queryCloudRun(action="list")` -> list services
- `queryCloudRun(action="detail")` -> inspect one service and its latest deploy status when available
- `queryCloudRun(action="templates")` -> see available starters
- `queryCloudRun(action="getDeployLog")` -> retrieve the latest deploy log or a specified `buildId`
- `queryCloudRun(action="envStatus")` -> check whether the environment's CloudRun is opened and its provisioning status (`Status=creating` opening / `normal` opened) — use after `initEnv` to poll progress or before `deploy` to confirm readiness

### Write operations

- `manageCloudRun(action="initEnv")` -> **open (initialize) CloudRun for the environment** — async, idempotent (`Status=normal` → already opened, no re-create). Use on a brand-new environment before the first deploy, or when `deploy` is blocked with an "尚未初始化云托管" message. Params: `envId` (defaults to the configured env), `packageType` (default `Trial`). Poll `queryCloudRun(action="envStatus")` until `Status=normal`.
- `manageCloudRun(action="init")` -> create local project
- `manageCloudRun(action="download")` -> pull remote code
- `manageCloudRun(action="run")` -> local run for Function mode
- `manageCloudRun(action="deploy")` -> deploy local project (**two ways**: source build via `targetPath`, or existing image via `imageUrl`) — existing services: RMW preserves remote VpcConf / EnvParams keys / OpenAccessTypes; **new services automatically validate that the environment's CloudRun is initialized** — if not, deploy is blocked with guidance to call `initEnv` first
- `manageCloudRun(action="updateConfig")` -> config-only update (no code upload; VPC / EnvParams / scaling / access types)
- `manageCloudRun(action="delete")` -> delete service
- `manageCloudRun(action="createAgent")` -> create Agent service

## Deploying an existing image (imageUrl)

> 已有一个现成镜像（本地构建好、或第三方发布）时，不需要本地源码目录，直接 `manageCloudRun(action="deploy")` 传入 `imageUrl` 即可，走 `DeployType="image"`（容器型）部署，`targetPath` 可省略。

**决策路径（直填 vs 本地中转）：**

1. **公网匿名可拉取**（如 `ccr.ccs.tencentyun.com/...`、公开 Docker Hub 镜像）→ **直填 imageUrl**：`manageCloudRun(action="deploy", serverName=..., imageUrl="ccr.ccs.tencentyun.com/ns/img:v1", serverConfig={...})`。CloudBase 会直接拉取该 registry 地址构建部署。
2. **私有 / 需登录的 registry**（`ghcr.io`、私有 ECR/Harbor 等）→ **本地中转到 CCR**：
   ```
   docker pull ghcr.io/nousresearch/hermes-agent:latest   # 本地先拉取
   docker tag ghcr.io/nousresearch/hermes-agent:latest ccr.ccs.tencentyun.com/<ns>/hermes-agent:latest
   docker login ccr.ccs.tencentyun.com                    # 用腾讯云容器镜像服务账号登录
   docker push ccr.ccs.tencentyun.com/<ns>/hermes-agent:latest
   ```
   然后把 `ccr.ccs.tencentyun.com/<ns>/hermes-agent:latest` 作为 `imageUrl` 传入。

**与 initEnv 联动：** 镜像部署同样要求环境已开通云托管。新环境首次部署前先 `manageCloudRun(action="initEnv", envId=...)`，并用 `queryCloudRun(action="envStatus")` 轮询到 `Status=normal`；未开通时 `deploy` 会被拦截并引导先 `initEnv`。

**示例：**

```json
{
  "action": "deploy",
  "serverName": "hermes-agent",
  "imageUrl": "ccr.ccs.tencentyun.com/ns/hermes-agent:latest",
  "serverConfig": {
    "OpenAccessTypes": ["PUBLIC"],
    "Cpu": 0.5,
    "Mem": 1,
    "MinNum": 1,
    "MaxNum": 3,
    "EnvParams": "{\"PORT\":\"3000\"}"
  }
}
```

部署后可用 `queryCloudRun(action="detail")` 查看 `imageInfo`（镜像地址与部署类型）。

## Access guidance

- **Web/public scenarios** -> enable PUBLIC ingress intentionally and pair it with the right auth flow.
- **Mini Program** -> prefer internal direct connection and avoid unnecessary public exposure.
- **Private ingress scenarios** -> keep public access off unless the product requirement clearly needs it.
- **Database / Redis in a VPC** -> this is **not** solved by `OpenAccessTypes`. You must set `serverConfig.VpcConf` and use the database private address. Read `references/vpc-and-database.md`.

## Quick examples

### Initialize

```json
{ "action": "init", "serverName": "my-svc", "targetPath": "/abs/ws/my-svc" }
```

### Local run (Function mode)

```json
{ "action": "run", "serverName": "my-svc", "targetPath": "/abs/ws/my-svc", "runOptions": { "port": 3000 } }
```

### Deploy (no VPC-private dependencies)

```json
{
  "action": "deploy",
  "serverName": "my-svc",
  "targetPath": "/abs/ws/my-svc",
  "serverConfig": {
    "OpenAccessTypes": ["PUBLIC"],
    "Cpu": 0.5,
    "Mem": 1,
    "MinNum": 1,
    "MaxNum": 5
  }
}
```

### Deploy (existing app that connects to MySQL / PostgreSQL / Redis over TCP)

```json
{
  "action": "deploy",
  "serverName": "my-existing-app",
  "targetPath": "/abs/ws/my-existing-app",
  "serverConfig": {
    "OpenAccessTypes": ["PUBLIC"],
    "Cpu": 0.5,
    "Mem": 1,
    "MinNum": 1,
    "MaxNum": 5,
    "EnvParams": "{\"DATABASE_URL\":\"postgres://user:pass@10.x.x.x:5432/app\"}",
    "VpcConf": {
      "VpcId": "vpc-xxxxxxxx",
      "SubnetId": "subnet-xxxxxxxx"
    }
  }
}
```

**Valid `OpenAccessTypes` values**: `OA` (办公网访问), `PUBLIC` (公网访问), `MINIAPP` (小程序访问), `VPC` (VPC访问). Use `PUBLIC` for web applications that need public HTTPS access.

`MinNum: 1` is the recommended default when you want to reduce cold-start latency. If the user explicitly prefers lower cost and accepts more cold starts, explain the tradeoff and let them reduce `MinNum` to `0`.

## Best practices

1. Prefer PRIVATE/VPC or mini-program internal **ingress** when possible.
2. For TCP database access, always pair private DB URLs with `VpcConf` in the same VPC/region as the database.
3. Use environment variables for secrets and per-environment configuration — **read them server-side only; never return them in HTTP responses**.
4. Verify configuration before and after deployment with `queryCloudRun(action="detail")`.
5. Keep startup work small to reduce cold-start impact.
6. For Agent scenarios, use the Agent SDK skill for protocol and adapter details instead of duplicating them here.
7. For smoke tests, return a fixed `{ "ok": true }` / health payload — never deploy httpbin or any service that reflects request headers.

## Troubleshooting hints

- **Access failure** -> check ingress access type, domain setup, and whether the instance scaled to zero.
- **Deployment blocked with "尚未初始化云托管 / not initialized"** -> the environment needs CloudRun enabled first: call `manageCloudRun(action="initEnv", envId=...)` (异步开通) and poll `queryCloudRun(action="envStatus")` until `Status=normal`; or open the console `环境 → 云托管 → 开通`. For stateless HTTP services, consider an HTTP cloud function instead of CloudRun entirely.
- **Deployment failure** -> inspect Dockerfile, build logs, and CPU/memory ratio.
- **Local run failure** -> remember only Function mode is supported by local-run tools.
- **Performance issues** -> reduce dependencies, optimize initialization, and tune minimum instances.
- **DB / Redis connection failure after a successful deploy** -> almost always missing or wrong `VpcConf`, wrong private host, or security group. Follow `references/vpc-and-database.md` before rewriting application code.

## Reference index

All packaged reference files (required for skill lint reachability):

- [vpc-and-database.md](references/vpc-and-database.md)

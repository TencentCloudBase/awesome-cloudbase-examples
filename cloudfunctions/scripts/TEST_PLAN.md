# 云函数测试方案 / Cloud Function Test Plan

本文档定义如何系统性地验证 `cloudfunctions/` 下所有函数模板的**可部署性**和**可运行性**。所有测试脚本均放在本目录（`cloudfunctions/scripts/`），可在本机或 CI 中执行。

This document defines how to systematically verify the **deployability** and **runnability** of every function template under `cloudfunctions/`. All test scripts live in this folder (`cloudfunctions/scripts/`) and can run on a local machine or in CI.

---

## 测试目标 / Goals

1. **可部署**：每个函数能成功通过 `tcb fn deploy` 发布到 CloudBase 环境。
2. **可运行**：部署后能被调用并返回预期结果（SCF 事件型用 `tcb fn invoke`，HTTP 类用 HTTP 请求）。

1. **Deployable**: every function can be published to a CloudBase environment via `tcb fn deploy`.
2. **Runnable**: after deployment it can be invoked and returns the expected payload (use `tcb fn invoke` for SCF event functions, HTTP requests for HTTP functions).

---

## 测试分级 / Test Tiers

| Tier | 内容 / Scope | 是否需要 CloudBase 环境 / Needs cloud? | 入口脚本 / Entry script |
|---|---|---|---|
| **0** | 静态检查：JSON 校验、`scf_bootstrap` 可执行、源码语法快检 | 否 / No | `test-local.sh --tier=0` |
| **1** | 本地运行检查：HTTP 函数本地起服 `curl 127.0.0.1:9000`，SCF 函数本地 mock event 调用入口 | 否 / No | `test-local.sh --tier=1` |
| **2** | 真实部署：`tcb fn deploy` + `tcb fn invoke` / HTTP `curl` 远端验证 | 是 / Yes（需 `ENV_ID`） | `test-deploy.sh` |
| **3** | 业务正确性：依赖数据库/微信资质等外部因素，按需手工执行 | 是 / Yes | 手工 / manual |

CI 推荐执行：**Tier 0 + Tier 1** 必跑；**Tier 2** 在带凭据的流水线里跑。

---

## 测试矩阵 / Test Matrix

完整矩阵以可执行数据形式维护在 [`test-matrix.json`](./test-matrix.json)，每条目结构如下：

The full matrix lives in [`test-matrix.json`](./test-matrix.json). Each entry looks like:

```json
{
  "name": "scf-nodejs-helloworld",
  "type": "scf",                         // "scf" | "http"
  "lang": "nodejs",                      // nodejs | python | go | java | php
  "deployable": true,                    // false 表示不可直接 tcb fn deploy
  "skipReason": null,                    // 不可部署的原因
  "prepare": null,                       // 部署前需要执行的命令（如 mvn package）
  "localStart": null,                    // 本地启动命令（HTTP 函数用）
  "localPort": 9000,
  "invoke": {                            // SCF 调用参数
    "params": {}
  },
  "http": {                              // HTTP 路径与断言
    "path": "/",
    "expectStatus": 200,
    "expectContains": ["Hello"]
  },
  "envRequires": []                      // 部署时需要预设的环境变量
}
```

特殊说明 / Special cases:

- `scf-go-helloworld` / `scf-java-helloworld` / `scf-php-helloworld`：已改造为标准 SCF runtime（`Go1` / `Java8` / `Php7.4`），可直接 `tcb fn deploy` 部署；Go/Java 需要先在本机构建产物（`./build.sh` 或 `mvn clean package`），脚本通过 matrix 的 `prepare` 字段自动执行。
- `scf-nodejs-hono-template`：业务上是 HTTP 风格，但配置里声明为事件型 SCF，部署后无法按 HTTP 路由直接访问，仅 Tier 1 做本地 HTTP 验证，Tier 2 标 `WARN` 而非 `FAIL`。
- `http-php-laravel`：模板里未预置 Laravel 完整脚手架（README 要求 `composer create-project`），Tier 2 默认 `SKIP: requires composer create-project`。
- HTTP 函数（`http-*`）：部署后还要调 `tcb service create` 把 `/<name>` 路径绑定到该函数才能被 `*.service.tcloudbase.com` 访问，`test-deploy.sh` 在部署成功后会自动调用一次（幂等：路径已存在则忽略）。
- 业务型函数（`scf-nodejs-wxpay-*`、`scf-nodejs-transaction`、`scf-nodejs-book-*` 等）：Tier 2 只断言"函数可调用、入参不为空时不抛出 5xx 级错误"，业务级行为在 Tier 3 手工验证。

---

## 前置准备 / Prerequisites

```bash
# 1. CLI 与本地工具 / CLI & local tools
npm install -g @cloudbase/cli
# 可选：本地构建工具
#   - Go:     go (>=1.18)
#   - Java:   mvn, jdk11+
#   - PHP:    php, composer
#   - Python: python3, pip
#   - Node:   node (>=18)

# 2. 登录 CloudBase / Log in
tcb login                                              # 交互式
# 或 CI 推荐 / Or for CI
tcb login --key --secretId "$SECRET_ID" --secretKey "$SECRET_KEY"

# 3. 配置环境变量 / Env vars
# 推荐方式：把 scripts/.env.example 复制为 scripts/.env，然后编辑取值。
# 脚本启动时会自动加载 scripts/.env；命令行已 export 的同名变量优先。
# Recommended: copy scripts/.env.example to scripts/.env and edit the values.
# Scripts auto-load scripts/.env on startup; CLI-exported vars take precedence.
cp scripts/.env.example scripts/.env
$EDITOR scripts/.env                                   # 至少填写 ENV_ID

# 或者临时通过命令行 export
export ENV_ID=xxxxxx                                   # 你的 CloudBase 环境 ID
export TEST_NAME_PREFIX=test-                          # 可选：为测试函数名加前缀，避免与生产冲突
```

> `scripts/.env` 已被 `scripts/.gitignore` 与仓库根 `.gitignore` 双重忽略，**不会**被提交进版本库；`scripts/.env.example` 仅作为模板。
>
> `scripts/.env` is ignored by both `scripts/.gitignore` and the repo root `.gitignore`; it will NOT be committed. Only `scripts/.env.example` is tracked as a template.

> Tier 2 默认使用各 `cloudbaserc.json` 里的函数名直接部署。如果你希望与已有生产函数隔离，可设置 `TEST_NAME_PREFIX=test-`，脚本会临时改写函数名后再部署，并在 `--cleanup` 时清理。

---

## 通过/失败判定 / Pass/Fail Criteria

| 阶段 / Phase | 通过条件 / Pass | 失败条件 / Fail |
|---|---|---|
| Tier 0 | 所有 `cloudbaserc.json` 解析通过；HTTP 目录 `scf_bootstrap` 存在且可执行；语法快检零错误 | 任一项失败 |
| Tier 1 | HTTP 函数本地 9000 端口 GET `/` 返回 2xx 且响应包含 `expectContains`；SCF 函数 mock 调用 stdout/return 包含 `expectContains` | 启动失败 / HTTP 超时 / 断言失败 |
| Tier 2 | `tcb fn deploy` 退出码 = 0；`tcb fn detail <name>` 找得到函数；后续 `tcb fn invoke` 或 HTTP 调用返回断言通过 | 部署退出码 ≠ 0 / detail 查不到 / 调用断言失败 |

退出码语义（参考 CloudBase CLI 文档）：`0 ok / 2 auth / 3 args / 4 not-found / 5 cloud-api`。脚本对 `5` 做一次自动重试。

---

## 脚本使用 / Script Usage

```bash
# Tier 0 + Tier 1（不依赖云）
./scripts/test-local.sh                 # 全量跑
./scripts/test-local.sh --tier=0        # 仅静态
./scripts/test-local.sh --tier=1        # 仅本地启动
./scripts/test-local.sh --only http-nodejs-express,http-python-fastapi
./scripts/test-local.sh --skip http-php-laravel

# Tier 2（需要 ENV_ID + 已登录）
./scripts/test-deploy.sh                          # 默认部署 + 调用，不清理
./scripts/test-deploy.sh --only http-nodejs-koa
./scripts/test-deploy.sh --cleanup                # 部署 + 调用 + 自动清理（先删 HTTP service 再删 function）
./scripts/test-deploy.sh --clean-up               # 只清理，不部署不调用（来源 = 本仓库 cloudfunctions/ 子目录 + .env::PREFIX）
./scripts/test-deploy.sh --dry-run                # 只打印将要执行的命令
./scripts/test-deploy.sh --prefix test-           # 等同 TEST_NAME_PREFIX=test-
```

**`--clean-up` 行为细节** / Behavior details:

- 来源 = 本仓库 `cloudfunctions/*/cloudbaserc.json` 所在目录名（30 个函数），不依赖 `test-matrix.json`。
- `deploy_name = ${PREFIX}${dir_name}`，`PREFIX` 来自 `--prefix` 或 `.env::TEST_NAME_PREFIX`。
- 执行前列出目标清单，要求输入 `yes` 二次确认（`--dry-run` 跳过确认）。
- 顺序：先 `tcb service delete --name <deploy_name>`（HTTP 访问服务），再 `tcb fn delete <deploy_name> --yes`（函数本体）。
- 单个目标删除失败/不存在都打 `[INFO] ... already clean` 不阻断流程；真正错误会以 `[WARN]` 打印 stderr 摘要。

**`--cleanup` 行为细节** / Behavior details:

- 部署 + 调用结束后**串联执行**清理，逻辑与 `--clean-up` 一致。
- HTTP 函数：部署后自动 `tcb service create -p /<name> -f <name>` 创建访问路径；清理时反向删除。

每次执行后会在 `scripts/.last-report.json` 写入结果汇总，并以表格形式打印到终端。

---

## 推荐执行顺序 / Recommended Workflow

1. **每次提交前**：在本机跑 `./scripts/test-local.sh`（Tier 0 + Tier 1）。
2. **PR 流水线**：在 CI 上跑 `./scripts/test-local.sh`，对不需要外部依赖的目录全量执行。
3. **发布演练**：在有 CloudBase 凭据的隔离环境里跑 `./scripts/test-deploy.sh --prefix test- --cleanup`。
4. **业务联调**：在真实环境 + 真实数据下手工触发 Tier 3 用例。

---

## 限制与已知约束 / Limitations

- CloudBase HTTP 函数有冷启动开销 + HTTP 访问服务路径生效延迟（数秒），Tier 2 HTTP 用例在脚本中默认重试 5 次（每次间隔 5s，总窗口 ~25s）。
- HTTP CustomRuntime（Go/Java/PHP）必须先在本机构建产物（详见各目录 README 的 prepare 步骤；脚本会读取 matrix 中的 `prepare` 字段自动执行）。
- `tcb fn deploy --all` 在仓库根级 `cloudfunctions/cloudbaserc.json` 中已配置完整列表；脚本默认按目录单个部署，方便定位失败函数。
- CloudBase CLI v3.3+ 的 `tcb fn delete` 已移除 `--force`，改用 `--yes` 跳过交互确认；脚本同时兼容旧版（若 `--yes` 被拒绝则回退 `--force`）。
- HTTP 网关返回的 `HTTP/1.1 443 Unknown` 不是标准 HTTP 状态码，而是 CloudBase 自定义的"upstream 未在合理时间内响应"错误码；常见原因是 `scf_bootstrap` 没有在 9000 端口启动 HTTP 服务，需检查 `scf_bootstrap` 内容与可执行权限。

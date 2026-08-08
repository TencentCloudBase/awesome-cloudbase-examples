# 模板部署验证方案 / Template Deploy Verification Plan

本文档定义如何系统性地验证 `cloudfunctions/` 和 `cloudbaserun/` 下所有模板的**可部署性**和**可运行性**。验证脚本统一放在 `tools/deploy-verify/`，各项目通过 `scripts/` 下的 wrapper 脚本调用。

This document defines how to systematically verify the **deployability** and **runnability** of every template under `cloudfunctions/` and `cloudbaserun/`. All test scripts live in `tools/deploy-verify/`; each project calls them via wrapper scripts in its own `scripts/` directory.

---

## 目录结构 / Directory Structure

```
tools/deploy-verify/            # 共享验证工具（通用）
  ├── lib-common.sh              # 共享函数库
  ├── test-deploy.sh             # Tier 2 远程部署验证
  ├── test-local.sh              # Tier 0 + Tier 1 本地验证
  ├── .env.example               # 环境变量样板
  └── TEST_PLAN.md               # 本文档

cloudfunctions/scripts/          # cloudfunctions 项目 wrapper
  ├── test-deploy.sh             # → ../../tools/deploy-verify/test-deploy.sh
  ├── test-local.sh              # → ../../tools/deploy-verify/test-local.sh
  ├── lib-common.sh              # → ../../tools/deploy-verify/lib-common.sh
  ├── test-matrix.json           # cloudfunctions 测试矩阵
  ├── .env                       # 本地环境变量（不入仓）
  └── .gitignore

cloudbaserun/scripts/            # cloudbaserun 项目 wrapper
  ├── test-deploy.sh             # → ../../tools/deploy-verify/test-deploy.sh
  ├── test-local.sh              # → ../../tools/deploy-verify/test-local.sh
  ├── lib-common.sh              # → ../../tools/deploy-verify/lib-common.sh
  ├── test-matrix.json           # cloudbaserun 测试矩阵
  ├── .env                       # 本地环境变量（不入仓）
  └── .gitignore
```

Wrapper 脚本会在调用前设置 `CF_ROOT` 环境变量，指向对应项目根目录。共享脚本根据 `$CF_ROOT/scripts/test-matrix.json` 和 `$CF_ROOT/scripts/.env` 来加载测试配置和环境变量。

Wrapper scripts set the `CF_ROOT` environment variable before delegating. Shared scripts load test configuration from `$CF_ROOT/scripts/test-matrix.json` and env vars from `$CF_ROOT/scripts/.env`.

---

## 测试目标 / Goals

1. **可部署**：每个模板能成功部署到 CloudBase 环境（cloudfunctions 用 `tcb fn deploy`，cloudbaserun 用 CloudBase Run 容器部署）。
2. **可运行**：部署后能被调用并返回预期结果。

1. **Deployable**: every template can be published to a CloudBase environment.
2. **Runnable**: after deployment it can be invoked and returns the expected payload.

---

## 测试分级 / Test Tiers

| Tier | 内容 / Scope | 是否需要 CloudBase 环境 / Needs cloud? | 入口脚本 / Entry script |
|---|---|---|---|
| **0** | 静态检查：JSON 校验、`scf_bootstrap` 可执行、源码语法快检、Dockerfile 存在性 | 否 / No | `test-local.sh --tier=0` |
| **1** | 本地运行检查：HTTP 函数本地起服 `curl 127.0.0.1:9000`，SCF 函数本地 mock event 调用入口 | 否 / No | `test-local.sh --tier=1` |
| **2** | 真实部署：`tcb fn deploy` + invoke / HTTP curl 远端验证 | 是 / Yes（需 `ENV_ID`） | `test-deploy.sh` |
| **3** | 业务正确性：依赖数据库/微信资质等外部因素，按需手工执行 | 是 / Yes | 手工 / manual |

CI 推荐执行：**Tier 0 + Tier 1** 必跑；**Tier 2** 在带凭据的流水线里跑。

---

## 测试矩阵 / Test Matrix

每个项目在 `scripts/test-matrix.json` 中维护自己的测试矩阵。每条目结构如下：

Each project maintains its own test matrix in `scripts/test-matrix.json`. Entry structure:

```json
{
  "name": "http-nodejs-helloworld",
  "type": "http",                         // "scf" | "http" | "container"
  "lang": "nodejs",                       // nodejs | python | go | java | php
  "deployable": true,                     // false 表示不可直接部署
  "skipReason": null,                     // 不可部署的原因
  "prepare": null,                        // 部署前需要执行的命令
  "localStart": null,                     // 本地启动命令（HTTP 函数用）
  "localPort": 9000,
  "invoke": { "params": {} },             // SCF 调用参数
  "http": {                               // HTTP 路径与断言
    "path": "/",
    "expectStatus": 200,
    "expectContains": ["Hello"]
  }
}
```

### type 字段说明 / type field

| type | 说明 | 部署方式 |
|---|---|---|
| `scf` | SCF 事件型函数 | `tcb fn deploy` |
| `http` | HTTP 函数（Web 函数） | `tcb fn deploy` + `tcb service create` |
| `container` | CloudBase Run 容器模板 | `tcb run deploy`（通过 cloudbaserc.json framework） |

---

## 前置准备 / Prerequisites

```bash
# 1. CLI 与本地工具 / CLI & local tools
npm install -g @cloudbase/cli

# 2. 登录 CloudBase / Log in
tcb login

# 3. 配置环境变量 / Env vars
# 复制工具目录的 .env.example 到目标项目的 scripts/ 下：
cp tools/deploy-verify/.env.example cloudfunctions/scripts/.env
$EDITOR cloudfunctions/scripts/.env              # 至少填写 ENV_ID

# 或者临时通过命令行 export
export ENV_ID=xxxxxx
export TEST_NAME_PREFIX=test-
```

---

## 通过/失败判定 / Pass/Fail Criteria

| 阶段 / Phase | 通过条件 / Pass | 失败条件 / Fail |
|---|---|---|
| Tier 0 | `cloudbaserc.json` 解析通过；HTTP 目录 `scf_bootstrap` 存在且可执行；语法快检零错误 | 任一项失败 |
| Tier 1 | HTTP 函数本地端口 GET 返回预期状态码且响应包含 `expectContains`；SCF 函数 mock 调用成功 | 启动失败 / HTTP 超时 / 断言失败 |
| Tier 2 | 部署退出码 = 0；后续调用返回断言通过 | 部署退出码 ≠ 0 / 调用断言失败 |

---

## 脚本使用 / Script Usage

```bash
# cloudfunctions 测试
cd cloudfunctions

# Tier 0 + Tier 1（不依赖云）
./scripts/test-local.sh                 # 全量跑
./scripts/test-local.sh --tier=0        # 仅静态
./scripts/test-local.sh --tier=1        # 仅本地启动
./scripts/test-local.sh --only http-nodejs-express,http-python-fastapi

# Tier 2（需要 ENV_ID + 已登录）
./scripts/test-deploy.sh                # 默认部署 + 调用，不清理
./scripts/test-deploy.sh --only http-nodejs-koa
./scripts/test-deploy.sh --cleanup      # 部署 + 调用 + 自动清理
./scripts/test-deploy.sh --clean-up     # 只清理，不部署不调用
./scripts/test-deploy.sh --dry-run      # 只打印将要执行的命令
./scripts/test-deploy.sh --prefix test- # 等同 TEST_NAME_PREFIX=test-

# cloudbaserun 测试（同理）
cd cloudbaserun
./scripts/test-local.sh --tier=0
```

每次执行后会在 `scripts/.last-report.json` 写入结果汇总。

---

## cloudbaserun 容器模板注意事项

- cloudbaserun 模板的 Tier 2 部署方式不同于 cloudfunctions，需要 CloudBase Run 支持
- Tier 0 会额外检查 `Dockerfile` 是否存在
- Tier 1 容器模板默认标记为 skip（需要 Docker 环境）
- 容器模板的 `cloudbaserc.json` 使用 `framework.plugins.container` 结构，而非 `functions[]` 数组

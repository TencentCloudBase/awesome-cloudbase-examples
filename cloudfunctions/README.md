# cloudfunctions

本目录是 CloudBase 云函数示例集。每个子目录是一个独立的云函数，并包含 `cloudbaserc.json` 单函数配置，可以直接使用 CloudBase CLI（`tcb`） 部署。

## 前置条件

```bash
# 安装 CloudBase CLI（>= 2.x，推荐 >= 2.12 以获得环境变量增量更新等能力）
npm install -g @cloudbase/cli

# 登录
tcb login
```

## 部署方式

所有 `cloudbaserc.json` 中的 `envId` 当前为占位 `YOUR_ENV_ID`，请按如下两种方式之一使用：

1. 直接编辑文件，替换为你的环境 ID；
2. 或在命令行用 `-e <你的环境ID>` 覆盖。

### 单个函数部署（在函数目录下）

```bash
cd cloudfunctions/scf-nodejs-helloworld
tcb fn deploy -e <你的环境ID>
```

### 在 `cloudfunctions/` 根目录批量部署

`cloudfunctions/cloudbaserc.json` 汇总了所有可直接部署的函数，可以：

```bash
cd cloudfunctions

# 部署单个函数
tcb fn deploy http-python-fastapi -e <你的环境ID>

# 一次部署本配置中所有函数
tcb fn deploy --all -e <你的环境ID>
```

## 函数类型与运行时约定

| 目录前缀 | 函数类型 | 运行时 | 说明 |
| --- | --- | --- | --- |
| `scf-nodejs-*` | SCF 事件型 | `Nodejs18.15` | `handler: index.main` |
| `scf-python-*` | SCF 事件型 | `Python3.10` | `handler: index.main` |
| `scf-go-helloworld` | SCF 事件型 | `Go1` | `handler: main`（即编译后二进制名）；部署前需 `./build.sh` 编译 Linux x64 二进制 |
| `scf-java-helloworld` | SCF 事件型 | `Java8` | `handler: example.Hello::mainHandler`；部署前需 `mvn clean package` |
| `scf-php-helloworld` | SCF 事件型 | `Php7.4` | `handler: index.main_handler` |
| `http-nodejs-*` | HTTP 函数 | `Nodejs18.15` | 监听 `0.0.0.0:9000`，含 `scf_bootstrap` |
| `http-python-*` | HTTP 函数 | `Python3.10` | 监听 `0.0.0.0:9000`，含 `scf_bootstrap` |
| `http-go-*` / `http-java-*` / `http-php-*` | HTTP 函数（CustomRuntime） | `CustomRuntime` | 监听 `0.0.0.0:9000`，含 `scf_bootstrap`；Java/Go 需提前编译产物 |

> 参考：CloudBase SCF 支持的标准 runtime 取值包括 `Nodejs18.15`/`Python3.10`/`Go1`/`Java8`/`Java11`/`Php7.4`/`Php8.0` 等；详见 [CloudBase 云函数配置文档](https://docs.cloudbase.net/cli-v1/functions/configs)。

## 其它常用命令

```bash
# 查看本地配置与云端配置的差异
tcb config diff -e <你的环境ID>

# 创建触发器（如 cloudbaserc.json 内有 triggers 字段）
tcb fn trigger create <name> -e <你的环境ID>

# 查看函数详情、日志
tcb fn detail <name> -e <你的环境ID>
tcb fn log <name> -e <你的环境ID>
```

## 自动化测试与清理 / Automated testing & cleanup

仓库提供了一套自动化测试与清理脚本，位于 [`scripts/`](./scripts/)：

- `scripts/test-local.sh`：Tier 0（静态检查）+ Tier 1（本地启动），不依赖 CloudBase 环境，适合 CI。
- `scripts/test-deploy.sh`：Tier 2 真实部署 + 调用验证，依赖 `ENV_ID` 和 `tcb login`。
- `scripts/test-matrix.json`：每个函数的测试元数据（部署 / 调用 / 断言）。
- `scripts/.env.example`：把它复制为 `scripts/.env` 后填入 `ENV_ID` 和可选 `TEST_NAME_PREFIX`，所有脚本会自动加载。

常用入口：

```bash
cd cloudfunctions

# 本地静态 + 启动检查（无需登录 CloudBase）
./scripts/test-local.sh

# 用前缀部署、调用、验证、自动清理（推荐隔离测试方式）
./scripts/test-deploy.sh --prefix test- --cleanup

# 只清理：扫描 cloudfunctions/ 子目录，结合 .env::TEST_NAME_PREFIX 计算函数名
./scripts/test-deploy.sh --clean-up
```

完整测试方案、测试分级、矩阵字段定义、通过/失败判定与限制说明，详见 [`scripts/TEST_PLAN.md`](./scripts/TEST_PLAN.md)。

The repo ships an automated test & cleanup toolkit under [`scripts/`](./scripts/). See [`scripts/TEST_PLAN.md`](./scripts/TEST_PLAN.md) for the full test plan, tier definitions, matrix schema, pass/fail criteria and known limitations.

## 模板同步到 CloudBase 数据模型 / Sync templates to CloudBase data model

云函数类（`scfFunc` / `scfWeb`）模板的元数据 + 源码 zip 可以通过 [`templates-sync/`](./templates-sync/) 下的脚本同步到指定 CloudBase 环境的「数据模型」，并把 zip 包传到该环境的文件存储。

The metadata + source-code ZIP of every function-type template (`scfFunc` / `scfWeb`) can be synced to a CloudBase data model and uploaded to Cloud Storage via the scripts under [`templates-sync/`](./templates-sync/).

```bash
cd cloudfunctions/templates-sync

# 只读探活：从线上数据模型拉前 5 条
node scripts/pull.mjs

# 把线上属于 scfFunc/scfWeb 的模板拉到本地（每个模板一个 JSON）
node scripts/pull-save.mjs

# 本地 JSON → 打包 → 上传文件存储 → upsert 数据模型
node scripts/push.mjs --only scf-nodejs-helloworld
```

完整方案、字段约定、命令清单与安全规则详见 [`templates-sync/README.md`](./templates-sync/README.md)。


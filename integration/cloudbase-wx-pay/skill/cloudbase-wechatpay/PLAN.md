# cloudbase-wechatpay Skill 设计计划

> 📅 创建时间：2026-04-23  
> 📋 状态：计划阶段  
> 👤 目标用户：CloudBase 外部开发者 + 内部技术支撑

---

## 一、定位与目标

### 1.1 一句话定位

教 AI 和用户如何在 **CloudBase 云开发平台**上使用 `pay-common` 模板接入微信支付——从选型、配置、部署到集成、排障的全流程指引。

### 1.2 与已有 Skill 的关系

```
                    微信支付 Skill 生态（互补关系）
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  wechatpay-basic-payment (已有)                              │
│  ├── 微信支付 API 层面（签名/错误码/退款规则）                 │
│  ├── Java / Go 代码示例                                      │
│  └── 商户模式 + 服务商模式                                    │
│                                                              │
│  wechatpay-product-coupon (已有)                              │
│  └── 商品券接入专项                                           │
│                                                              │
│  cloudbase-wechatpay 🆕 (本 Skill)                           │
│  ├── CloudBase 平台 + pay-common 模板                        │
│  ├── Node.js / Serverless / Express 架构                     │
│  ├── 三种部署方式（云函数 / 云托管 / 本地开发）                │
│  ├── 前端集成示例（小程序 / H5 / PC 扫码 / APP）             │
│  └── 未来：CLI 集成中心创建 + Git 模板仓库上架                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 目标用户画像

| 用户类型 | 典型 prompt | 需要什么 |
|---------|------------|---------|
| **外部客户-入门** | "我要在小程序里加支付功能" | 手把手引导，Quick Start |
| **外部客户-进阶** | "怎么配 Gateway 签名模式" | 详细配置文档 |
| **内部支撑** | "客户说签名失败，帮我看看" | 诊断脚本 + 排障速查 |
| **AI Agent** | 自动调用 skill 帮用户接入 | 结构化决策树 + Demo 索引 |

### 1.4 核心原则

1. **模板导向**：不重复讲微信支付 API，专注 pay-common 模板使用
2. **Demo 优先**：回答问题时优先引用 `example/` 下的参考代码
3. **脚本优先**：排查配置问题时优先使用诊断脚本
4. **互补引用**：API 层面问题引流到 `wechatpay-basic-payment`

---

## 二、Skill 类型与架构

### 2.1 类型：参考文档型 + 脚本增强型（混合模式）

对应 skill-design-guide 中的 **模式二 + 模式四**：
- **模式四（参考文档型）**：按场景分层的 references/ 目录，渐进式加载
- **模式二（脚本增强型）**：scripts/ 目录下的诊断校验脚本

### 2.2 目录结构

```
cloudbase-wechatpay/
├── SKILL.md                              # 路由表 + 决策树 + 全局规范（≤400行）
├── references/                           # 按场景分层的详细文档
│   ├── 方案选型/
│   │   └── cloudbase-pay-overview.md         # CloudBase 支付方案全景 + 选型决策树
│   ├── 模板接入/
│   │   ├── quick-start.md                    # 5 分钟快速开始（从 0 到下单成功）
│   │   ├── env-config.md                     # 环境变量完整配置指南
│   │   └── sign-mode.md                      # SDK 模式 vs Gateway 模式详解
│   ├── 部署/
│   │   ├── deploy-cloud-function.md          # 部署为 HTTP 云函数
│   │   ├── deploy-cloud-run.md               # 部署为云托管（Docker）
│   │   └── deploy-local.md                   # 本地开发调试
│   ├── 前端集成/
│   │   ├── miniprogram-cloud-api.md          # 小程序 - 云API调用（推荐）
│   │   ├── miniprogram-cloud-run.md          # 小程序 - 云托管直连
│   │   ├── web-h5.md                         # H5 页面（手机浏览器）
│   │   ├── web-native.md                     # PC 扫码支付
│   │   └── app.md                            # APP 端
│   ├── 业务开发/
│   │   ├── order-service.md                  # orderService 数据库集成
│   │   ├── transfer.md                       # 商家转账注意事项
│   │   └── security-checklist.md             # 安全红线 + 上线清单
│   └── 问题排查/
│       ├── troubleshooting.md                # 常见问题速查表（20+ 条目）
│       └── error-patterns.md                 # 签名/回调/部署 错误模式详解
├── scripts/
│   ├── validate_env.sh                       # 校验 .env 配置完整性
│   ├── check_pem_format.py                   # PEM 私钥格式检查
│   ├── check_deploy_config.py                # cloudbaserc.json 与 .env 一致性
│   └── test_callback_url.sh                  # 回调 URL 连通性测试
└── assets/
    └── architecture.md                       # 架构图（Mermaid 格式）
```

### 2.3 渐进式加载策略

```
L0: description (~80 tokens)              ← 始终在上下文（决定是否加载 skill）
L1: SKILL.md body (~400行)                ← skill 加载后注入
    ├── 五大能力路由表
    ├── 快速决策树
    ├── API 路由速查表
    ├── Demo 索引表
    └── 安全红线速查（6 条）
L2: references/ 单篇文档                   ← 按需加载（每次 1-2 篇）
L3: scripts/ 脚本执行                      ← 排障时按需调用
```

---

## 三、五大能力设计

### 能力 1：方案选型

| 维度 | 内容 |
|------|------|
| **触发 prompt** | "我要在小程序里加支付" / "pay-common 和云调用区别" / "支付方案怎么选" |
| **加载文档** | `references/方案选型/cloudbase-pay-overview.md` |
| **内容来源** | `pay-common-方案对比分析.md` + `微信支付三种方式对比报告.md` |
| **引用关系** | 支付方式选型（JSAPI/H5/Native/APP）→ 引用 `wechatpay-basic-payment` 能力1 |

**决策树**（写入 SKILL.md）：

```
用户要接微信支付
├── 想了解支付方式区别（JSAPI/H5/Native/APP）
│   └── 引导到 wechatpay-basic-payment 选型能力
├── 想选择 CloudBase 部署方案
│   └── 加载 cloudbase-pay-overview.md
│       ├── 云函数（推荐，Serverless，免运维）
│       ├── 云托管（Docker，适合已有容器化项目）
│       └── 本地开发（调试用）
└── 已经决定用 pay-common
    └── 进入能力2：模板接入
```

### 能力 2：模板接入（核心能力）

| 维度 | 内容 |
|------|------|
| **触发 prompt** | "怎么用 pay-common" / "环境变量怎么配" / "SDK 和 Gateway 什么区别" |
| **加载文档** | `quick-start.md` / `env-config.md` / `sign-mode.md`（按需） |
| **内容来源** | `pay-common/README.md`（§前提条件、§铁律、§Step 1‑3、§签名模式详解） + `开发注意事项与模板使用指南.md` + `pay-common-best-practices.md` |

**子能力拆分**：

| 子能力 | 文档 | 内容要点 |
|--------|------|---------|
| 快速开始 | `quick-start.md` | 5 步走：获取凭证 → 配环境变量 → 部署 → 配回调 → 前端接入 |
| 环境变量 | `env-config.md` | 完整配置项清单 + 必填/选填标注 + 配置示例（SDK/Gateway 双模式） |
| 签名模式 | `sign-mode.md` | SDK 直签 vs Gateway 代签，各自适用场景 + 切换方式 + 回调地址差异 |

**关键要点（来自 README）**：
- **铁律**：金额单位（分）、订单号全局唯一、下单与调起使用同一私钥
- **前提条件**：商户号、API 证书序列号、私钥文件、微信支付公钥、APIv3 密钥、AppID
- **配置示例**：SDK 模式与 Gateway 模式的 `.env` 示例
- **签名模式详解**：`signMode=sdk`（自行验签解密） vs `signMode=gateway`（集成中心解密转发）

### 能力 3：部署

| 维度 | 内容 |
|------|------|
| **触发 prompt** | "怎么部署到云函数" / "用云托管" / "本地怎么调试" |
| **加载文档** | `deploy-cloud-function.md` / `deploy-cloud-run.md` / `deploy-local.md` |
| **内容来源** | `pay-common/README.md` Step 4 + `pay-common-architecture.md` + `pay-common/cloudbaserc.json` |
| **脚本辅助** | `validate_env.sh` + `check_deploy_config.py` |
| **未来扩展** | CLI 集成中心创建（预留 `cli-integration.md` 入口） |

**三种部署方式对比**（写入 SKILL.md 快查表）：

| 部署方式 | 命令 | 适用场景 | 回调 URL |
|---------|------|---------|---------|
| HTTP 云函数 | `tcb fn deploy pay-common` | 推荐，Serverless | 从控制台「HTTP 访问服务」获取公网域名（格式如 `https://{envId}.{region}.app.tcloudbase.com`，以控制台显示为准） |
| 云托管 | `tcb run deploy` | Docker 化项目 | `https://{envId}.{region}.run.tcloudbase.com/` |
| 本地开发 | `npm start` | 调试用 | 需 ngrok 等内网穿透 |

### 能力 4：前端集成

| 维度 | 内容 |
|------|------|
| **触发 prompt** | "小程序怎么调起支付" / "H5 怎么接" / "PC 扫码" |
| **加载文档** | 按场景加载对应文档 |
| **内容来源** | `pay-common/README.md` Step 5（小程序、H5、Native、APP） + `examples/miniprogram/` + `examples/miniprogram-cloudrun/` + `examples/react/` + `微信支付三种方式对比报告.md` |

**Demo 索引**（写入 SKILL.md + 每篇前端文档末尾）：

| Demo | 路径 | 调用方式 | 说明 |
|------|------|---------|------|
| 小程序-云API版 | `examples/miniprogram/` | `signInWithOpenId` + Bearer Token | 推荐，通过云API网关调用 |
| 小程序-云托管版 | `examples/miniprogram-cloudrun/` | `wx.request` 直连云托管 | 适合云托管部署 |
| Web 测试页 | `examples/react/`（test-wx-pay.html） | JSAPI + H5 + Native 三合一 | 浏览器端测试 |

**每篇前端文档必须包含**：
1. 前端完整调用链路（登录 → 下单 → 调起支付 → 查单 → 退款）
2. 关键代码片段（从 demo 中提取）
3. 注意事项（来自开发注意事项 + README 中的 H5 支付授权目录、APP 签名格式差异等）

### 能力 5：问题排查

| 维度 | 内容 |
|------|------|
| **触发 prompt** | "签名失败" / "回调收不到" / "部署后 502" |
| **加载文档** | `troubleshooting.md` + `error-patterns.md`（按需） |
| **内容来源** | `pay-common/README.md` §⚠️注意事项 + `开发注意事项与模板使用指南.md` §5 + FAQ 汇总 |
| **脚本辅助** | `check_pem_format.py` + `test_callback_url.sh` + `validate_env.sh` |
| **引用关系** | API 层错误码 → 引用 `wechatpay-basic-payment` 能力5 |

**速查表结构**（troubleshooting.md 核心）：

| 症状 | 可能原因 | 排查方式 | 参考文档 |
|------|---------|---------|---------|
| 签名失败 | PEM 换行符问题（`\\n` vs 真换行） | `scripts/check_pem_format.py` | env-config.md |
| 签名失败 | 公钥搞混（用了 API 证书公钥而非微信支付公钥） | 检查 WECHATPAY_PUBLIC_KEY 来源 | env-config.md |
| 回调收不到 | URL 不通 / 未开 HTTP 访问服务 | `scripts/test_callback_url.sh` | deploy-*.md |
| 回调收不到 | signMode 与回调地址不匹配 | 检查 signMode + notifyURL | sign-mode.md |
| 商户号错误 | mchId 未从后端返回 | 检查转账流程 mchId 透传 | transfer.md |
| 登录失败 | ENV_ID 或 PUBLISHABLE_KEY 配错 | 检查前端 app.js 配置 | miniprogram-*.md |
| openid 缺失 | JWT 中未包含 openid | 确认使用 signInWithOpenId | miniprogram-*.md |
| 部署 502 | 云函数冷启动超时 / 环境变量缺失 | `scripts/validate_env.sh` | deploy-*.md |

---

## 四、SKILL.md 关键设计

### 4.1 Description（触发词）

```yaml
description: >
  CloudBase 云开发平台微信支付接入指南，基于 pay-common 模板。
  Use when user mentions "CloudBase 支付", "云开发支付", "pay-common", 
  "支付模板", "云函数支付", "云托管支付", or asks "如何在云开发上接微信支付", 
  "pay-common 怎么部署", "pay-common 环境变量", "支付回调配不通", 
  "签名失败 PEM", even if they just say "帮我接个支付" in a CloudBase project.
  For WeChat Pay API-level questions (signing algorithm, error codes, refund rules), 
  defer to the wechatpay-basic-payment skill.
```

**排他关键词设计**：

| 关键词 | 触发本 Skill | 说明 |
|--------|:-----------:|------|
| `pay-common` | ✅ | 本 skill 独占 |
| `CloudBase 支付` / `云开发支付` | ✅ | 本 skill 独占 |
| `云函数支付` / `云托管支付` | ✅ | 本 skill 独占 |
| `支付模板` / `支付模板部署` | ✅ | 本 skill 独占 |
| `签名失败 PEM` / `环境变量` | ✅ | 配置层面 |
| `JSAPI 签名算法` / `API 错误码` | ❌ | → wechatpay-basic-payment |
| `退款规则` / `退款接口` | ❌ | → wechatpay-basic-payment |
| `商品券` / `发券` | ❌ | → wechatpay-product-coupon |

### 4.2 SKILL.md 内容结构（≤400行）

```markdown
# CloudBase 微信支付接入指南（pay-common 模板）

## 全局规范
- 确认部署方式 / 确认支付方式 / API 问题引流 / Demo 优先 / 脚本优先

## 关联技能
- wechatpay-basic-payment（API 层面）
- wechatpay-product-coupon（商品券）

## 能力路由表（5 大能力 × 触发条件 × 加载文档）

## 快速决策树（Mermaid）

## API 路由速查表
（基于 `pay-common/README.md` §路由表，含下单、查询、退款、转账、回调等全部路由）

## Demo 索引表

## 安全红线速查（6 条）
（基于 `pay-common/README.md` §铁律、§回调处理要求、§注意事项等）

## 环境变量速查表
（所有配置项 + 必填/选填 + 说明，取自 `pay-common/README.md` §环境变量）

## 脚本工具说明
```

### 4.3 全局交互规范

```markdown
## 全局规范

1. **确认部署方式**：任何能力使用前须先确认——云函数 / 云托管 / 本地开发
2. **确认支付方式**：仅下单和前端集成需要确认（JSAPI/H5/Native/APP）
3. **API 层面问题引流**：涉及签名算法、API 错误码、退款规则等→ 推荐 wechatpay-basic-payment
4. **Demo 优先**：回答前端集成问题时，优先引用 example/ 下的参考代码
5. **脚本优先**：排查配置问题时，优先使用 scripts/ 下的诊断脚本
6. **安全优先**：涉及私钥、证书等敏感信息时，提醒用户使用环境变量而非硬编码
```

---

## 五、脚本工具设计

### 5.1 脚本清单

| 脚本 | 功能 | 输入 | 输出 | 语言 |
|------|------|------|------|------|
| `validate_env.sh` | 校验 .env 配置完整性 | `.env` 文件路径 | JSON: 缺失项 + 格式错误 | Bash |
| `check_pem_format.py` | PEM 私钥格式检查 | privateKey 字符串或文件 | 真换行/字面换行/格式错误 | Python |
| `check_deploy_config.py` | cloudbaserc.json 一致性 | 项目路径 | envVariables vs .env 差异项 | Python |
| `test_callback_url.sh` | 回调 URL 连通性测试 | 回调 URL | HTTPS/连通/响应格式 | Bash |

### 5.2 脚本设计原则

- **无交互**：Agent 在非交互 shell 中运行，不能有 stdin 提示
- **结构化输出**：正常输出走 stdout（JSON），诊断日志走 stderr
- **--help 支持**：每个脚本必须支持 `--help`
- **幂等**：多次运行结果一致
- **安全**：不输出私钥内容，只报告格式是否正确
- **退出码**：0=正常，1=有问题，2=参数错误

---

## 六、参考文档内容来源映射

### 6.1 现有材料清单

| 材料 | 路径 | 行数 | 用途 |
|------|------|------|------|
| pay-common README | `pay-common/README.md` | ~600 | 核心参考，覆盖全流程 |
| 开发注意事项 | `pay-common/开发注意事项与模板使用指南.md` | ~300 | 踩坑记录、安全红线 |
| 架构设计笔记 | `notes/wechat-pay/pay-common-architecture.md` | - | 统一调用方式、鉴权模式 |
| 最佳实践路径 | `notes/wechat-pay/pay-common-best-practices.md` | - | Quick Start 路径 |
| 方案对比分析 | `notes/wechat-pay/pay-common-方案对比分析.md` | - | 方案选型依据 |
| 上下文分享 | `notes/wechat-pay/pay-common-上下文分享.md` | - | 产品背景、设计决策 |
| 三种方式对比 | `notes/wechat-pay/微信支付三种方式对比报告.md` | - | JSAPI/H5/Native 对比 |
| 商家转账分析 | `notes/wechat-pay/merchant-transfer-analysis.md` | - | 商家转账专项 |
| 改动分析 | `notes/wechat-pay/pay-common-changelog.md` | - | 版本变更记录 |
| 小程序 Demo | `examples/miniprogram/` | - | 前端集成示例 |
| 云托管 Demo | `examples/miniprogram-cloudrun/` | - | 云托管调用示例 |
| Web Demo | `examples/react/` | - | H5/Native 测试页 |

### 6.2 材料 → 文档映射

| 目标文档 | 主要来源 | 补充来源 |
|---------|---------|---------|
| `cloudbase-pay-overview.md` | 方案对比分析 + 上下文分享 | 三种方式对比 |
| `quick-start.md` | README Step 1-3 + 最佳实践路径 | 开发注意事项 §4.1 |
| `env-config.md` | README 环境变量 + 开发注意事项 §2.1-2.3 | 架构设计笔记 |
| `sign-mode.md` | README 签名模式详解 + 开发注意事项 §2.3 | 架构设计笔记 |
| `deploy-cloud-function.md` | README Step 4 方式一 | cloudbaserc.json |
| `deploy-cloud-run.md` | README Step 4 方式二 + cloudrun Demo README | Dockerfile |
| `deploy-local.md` | README 本地开发 | - |
| `miniprogram-cloud-api.md` | README Step 5 小程序 + `examples/miniprogram/` | 架构设计笔记 |
| `miniprogram-cloud-run.md` | cloudrun Demo README + `examples/miniprogram-cloudrun/` | - |
| `web-h5.md` | README + `examples/react/` | 三种方式对比 |
| `web-native.md` | README + `examples/react/` | 三种方式对比 |
| `app.md` | README APP 支付章节 | wechatpay-basic-payment 引用 |
| `order-service.md` | README Step 6 + 方案对比分析（数据库设计） | - |
| `transfer.md` | README 商家转账 + 商家转账分析 + 开发注意事项 §2.5 | - |
| `security-checklist.md` | 开发注意事项 §6 安全红线 | - |
| `troubleshooting.md` | 开发注意事项 §5 + cloudrun FAQ | - |
| `error-patterns.md` | 开发注意事项 §5 详细展开 | - |

### 6.3 README 关键章节映射

`pay-common/README.md` 中的以下关键章节将直接嵌入或引用到 skill 文档中：

| README 章节 | 内容要点 | 在 skill 中的位置 |
|-------------|---------|-----------------|
| **前提条件** | 商户号、API 证书、私钥、公钥、APIv3 密钥、AppID | `quick-start.md`、`env-config.md` |
| **⚠️ 铁律** | 金额单位（分）、订单号全局唯一、下单与调起同一私钥 | SKILL.md 安全红线速查、`security-checklist.md` |
| **Step 1‑3** | 获取模板、安装依赖、配置环境变量 | `quick-start.md` |
| **Step 4** | 部署为 HTTP 云函数、云托管、本地开发 | `deploy-cloud-function.md`、`deploy-cloud-run.md`、`deploy-local.md` |
| **Step 5** | 前端集成（小程序、H5、Native、APP） | 各前端集成文档 |
| **Step 6** | 接入业务逻辑（orderService） | `order-service.md` |
| **路由表** | 下单、查询、退款、转账、回调等全部路由 | SKILL.md API 路由速查表 |
| **⚠️ 注意事项** | AppID 类型对应、有效期、APP 签名格式差异、查单兜底、回调处理要求、回调 IP 白名单 | `troubleshooting.md`、`error-patterns.md`、`security-checklist.md` |
| **签名模式详解** | `signMode=sdk` vs `gateway`，主动请求与回调处理差异 | `sign-mode.md` |
| **目录结构** | 项目文件组织 | `assets/architecture.md` |

---

## 七、与已有 Skill 的协作设计

### 7.1 触发分流

| 用户意图 | 触发 Skill | 理由 |
|---------|-----------|------|
| "我要在 CloudBase 上接支付" | **cloudbase-wechatpay** 🆕 | 平台层面 |
| "pay-common 部署报错" | **cloudbase-wechatpay** 🆕 | 模板专属 |
| "环境变量怎么配" | **cloudbase-wechatpay** 🆕 | 配置层面 |
| "小程序怎么调起支付" | **cloudbase-wechatpay** 🆕 | 前端集成 |
| "签名失败，PEM 格式对吗" | **cloudbase-wechatpay** 🆕 | 配置排障 |
| "JSAPI 怎么签名" | wechatpay-basic-payment | API 层面 |
| "退款接口参数错了" | wechatpay-basic-payment | API 层面 |
| "错误码 PARAM_ERROR" | wechatpay-basic-payment | API 层面 |
| "商品券怎么发" | wechatpay-product-coupon | 商品券专项 |

### 7.2 互引方式

在 SKILL.md 中显式声明：

```markdown
## 🔗 关联技能

- **微信支付 API 层面**的选型、签名算法、代码示例、错误码排查
  → 推荐使用 wechatpay-basic-payment skill
- **商品券接入**
  → 推荐使用 wechatpay-product-coupon skill
- **本 Skill 专注**：CloudBase 平台上使用 pay-common 模板的部署、配置、集成、排障
```

---

## 八、实施计划

### 8.1 分期实施

| 阶段 | 内容 | 交付物 | 预计工时 |
|------|------|--------|---------|
| **P0（MVP）** | 核心框架 + 最高频场景 | SKILL.md + quick-start + env-config + sign-mode + troubleshooting + 2 个脚本 | 1-2 天 |
| **P1（完整）** | 全部 references + 全部 scripts | 15 篇参考文档 + 4 个脚本 | 2-3 天 |
| **P2（增强）** | CLI 集成 + Git 仓库 + 评估用例 | cli-integration.md + eval cases | 按需 |

### 8.2 P0 详细任务清单

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| 1 | 编写 SKILL.md 主文件 | `SKILL.md` (~400行) | 无 |
| 2 | 编写快速开始文档 | `references/模板接入/quick-start.md` | README + best-practices |
| 3 | 编写环境变量配置文档 | `references/模板接入/env-config.md` | README + 开发注意事项 |
| 4 | 编写签名模式文档 | `references/模板接入/sign-mode.md` | README + architecture |
| 5 | 编写问题排查速查表 | `references/问题排查/troubleshooting.md` | 开发注意事项 §5 |
| 6 | 开发 .env 校验脚本 | `scripts/validate_env.sh` | env-config.md |
| 7 | 开发 PEM 格式检查脚本 | `scripts/check_pem_format.py` | 无 |
| 8 | 冒烟测试（加载 + 路由验证） | 测试通过 | 1-7 全部完成 |

### 8.3 P1 详细任务清单

| # | 任务 | 产出 |
|---|------|------|
| 9 | 编写方案选型文档 | `references/方案选型/cloudbase-pay-overview.md` |
| 10 | 编写三种部署方式文档（×3） | `references/部署/deploy-*.md` |
| 11 | 编写前端集成文档（×5） | `references/前端集成/*.md` |
| 12 | 编写业务开发文档（×3） | `references/业务开发/*.md` |
| 13 | 编写错误模式详解 | `references/问题排查/error-patterns.md` |
| 14 | 开发部署配置检查脚本 | `scripts/check_deploy_config.py` |
| 15 | 开发回调 URL 测试脚本 | `scripts/test_callback_url.sh` |
| 16 | 编写架构图 | `assets/architecture.md` |
| 17 | 全量测试 + 评审 | 评审通过 |

### 8.4 P2 规划

| # | 任务 | 说明 |
|---|------|------|
| 18 | CLI 集成中心创建文档 | 对接 tcb CLI 创建支付模板项目的流程 |
| 19 | Git 模板仓库上架 | pay-common 上架到 Git 仓库的说明 |
| 20 | 评估用例设计 | 10+ eval cases 覆盖 5 大能力 |
| 21 | 评估 + 迭代优化 | 基于 eval 结果优化 description / 路由 / 文档 |

---

## 九、质量标准

### 9.1 完成标准（DoD）

- [ ] SKILL.md ≤ 400 行，L1 加载后上下文增量可控
- [ ] 每篇 reference 文档 ≤ 300 行（聚焦单一场景）
- [ ] 脚本全部通过 `--help` 自检 + 无交互 + 结构化输出
- [ ] 触发词不与已有 skill 冲突
- [ ] 5 大能力各至少 3 个典型 prompt 验证通过
- [ ] 安全红线无遗漏

### 9.2 评估维度（参考 evaluation-checklist）

| 维度 | 权重 | 评估方式 |
|------|------|---------|
| 触发准确性 | 25% | 10 个 prompt 命中率 ≥ 90% |
| 回答质量 | 30% | 代码可运行、步骤完整、无幻觉 |
| 排障有效性 | 20% | 脚本可执行、问题定位准确 |
| 引流准确性 | 15% | API 问题正确引导到 basic-payment |
| 上下文效率 | 10% | L1 加载不超 400 行、L2 单次 ≤ 2 篇 |

---

## 十、未来扩展预留

| 扩展方向 | 预留入口 | 时机 |
|---------|---------|------|
| CLI 集成中心创建 | `references/部署/cli-integration.md` | CLI 集成中心上线后 |
| Git 模板仓库上架 | `quick-start.md` 中预留"从模板仓库创建"章节 | 模板上架后 |
| 小程序云调用方案 | `references/方案选型/` 预留 `cloud-call.md` | 功能开发后 |
| 数据库集成示例 | `order-service.md` 预留 CloudBase 数据库 SDK 示例 | 有需求时 |
| 更多前端框架 | `references/前端集成/` 可扩展 Vue/React 示例 | 有 Demo 后 |

---

## 附录

### A. 关键术语表

| 术语 | 说明 |
|------|------|
| `pay-common` | CloudBase 微信支付通用模板（Node.js + Express） |
| `signMode` | 签名模式，`sdk`=SDK直签，`gateway`=网关代签 |
| `signInWithOpenId` | CloudBase 客户端 SDK 静默登录方法 |
| `accessToken` | CloudBase 认证令牌，用于调用云API |
| `HTTP 云函数` | CloudBase 支持 HTTP 触发的 Serverless 函数 |
| `云托管` | CloudBase 容器化部署服务（Cloud Run） |
| `HTTP 访问服务` | CloudBase 提供的公网域名，用于回调等外网访问 |

### B. 版本记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-23 | v0.1 | 初始计划创建 |
| 2026-04-24 | v0.2 | 结合 `pay-common/README.md` 完善，增加 README 关键章节映射 |

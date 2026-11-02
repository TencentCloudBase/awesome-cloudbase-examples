# cloudbase-stripe

Stripe 支付集成示例。面向国际业务：Checkout Session 收款 + Webhook 回调，支持 `signMode` 双验签模式（平台网关代验签 / 函数自验签）。

> 与微信支付（`cloudbase-wx-pay`）是两套独立模板，只是分层骨架同源。

## 目录结构

```
cloudbase-stripe/
├── functions/pay-stripe/    云函数（Express + Stripe SDK）
│   ├── config/              凭证读取与启动校验
│   ├── routes/              /stripe/create_session | retrieve_session | webhook
│   ├── controllers/         鉴权中间件 + 回调处理 + 统一应答
│   ├── services/            策略入口 + 事件分发 + 幂等
│   ├── .env.example         环境变量模板（复制为 .env）
│   ├── cloudbaserc.json     单函数部署声明
│   └── Dockerfile           云托管部署
└── examples/web/            Checkout 前端示例（单文件，零依赖）
```

## 快速开始

```bash
# 1. 装依赖 + 跑单测（16 个用例，不需要网络与真实密钥）
cd functions/pay-stripe
npm install && npm test

# 2. 填凭证（测试模式密钥即可，Stripe Dashboard → Developers → API keys）
export stripeSecretKey=sk_test_xxx
export signMode=sdk
export stripeWebhookSecret=whsec_xxx     # 用 stripe listen 打印的那个
export PORT=3000

# 3. 本地起服务 + 转发 webhook（另开终端）
node ./bin/www
stripe listen --forward-to localhost:3000/stripe/webhook

# 4. 跑前端示例
cd ../../examples/web && npx serve .
```

部署：`cd functions/pay-stripe && tcb fn deploy pay-stripe`（云托管则用 Dockerfile）。

## 环境变量

见 `functions/pay-stripe/.env.example`，核心 3 个：

| 变量 | 必填 | 说明 |
|---|---|---|
| `stripeSecretKey` | 是 | `sk_test_` / `sk_live_`，建议用受限密钥 `rk_` |
| `stripeWebhookSecret` | `signMode=sdk` 时必填 | `whsec_`，创建 endpoint 时只返回一次 |
| `signMode` | 否 | `gateway`（默认，平台代验签）/ `sdk`（自验签） |

## 范围

一期：Checkout Session 下单、单 Webhook 回调、验签、幂等。
二期：退款、订阅、Elements 嵌入式收银台。

## 已知待办

- `signMode=gateway` 时集成中心代验签后的明文字段名待联调确认（`services/stripeService.js` 内有 `TODO(集成中心联调)`）。
- 业务侧需把 `TODO(业务侧)` 处对接自己的订单表（当前只有内存 Map）。

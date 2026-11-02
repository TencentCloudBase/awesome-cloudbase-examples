# pay-stripe

Stripe Checkout 支付云函数模板。结构参考 `cloudbase-wx-pay/functions/pay-common`（微信支付）的分层骨架与 `signMode` 双验签模式，策略层替换为 Stripe SDK。

一期范围：Checkout Session 下单 + 单一 Webhook 回调 + 验签 + 幂等。退款 / 订阅 / Elements 嵌入收银台为二期。

## 目录结构

```
pay-stripe/
├── bin/www                     启动入口（监听 PORT）
├── app.js                      Express 装配：CORS → logger → json(存 rawBody) → /stripe → 云API适配 → 404/error
├── index.js                    云函数入口
├── config/config.js            凭证读取 + 校验
├── routes/stripe.js            路由表
├── controllers/stripeController.js  鉴权中间件 + 回调处理 + 统一应答
├── services/
│   ├── stripeService.js        策略入口 + 事件分发 + 幂等
│   └── strategies/stripeStrategy.js  Stripe SDK 封装（下单/查单/验签）
├── utils/
│   ├── currency.js             金额最小货币单位换算
│   └── cloudbaseAuth.js        JWT 解析用户身份
├── tests/                      单元测试
├── Dockerfile / scf_bootstrap  云托管 / 云函数部署
└── cloudbaserc.json            部署声明
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `stripeSecretKey` | 是 | `sk_live_` / `sk_test_`，建议用受限密钥 `rk_` |
| `stripeWebhookSecret` | `signMode=sdk` 时必填 | `whsec_`，endpoint 创建时只返回一次 |
| `stripeApiVersion` | 强烈建议 | 如 `2026-08-26.dahlia`，锁定避免 Stripe 升级导致静默失效 |
| `signMode` | 否 | `gateway`（默认，平台代验签）/ `sdk`（自验签） |
| `stripeSuccessUrl` | 否 | 支付成功跳转地址，前端传值优先 |
| `stripeCancelUrl` | 否 | 取消支付跳转地址 |
| `corsAllowOrigin` | 否 | 跨域白名单，多个逗号分隔 |

## 路由

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /stripe/create_session` | 是 | 创建 Session，返回 `{ sessionId, url }` |
| `POST|GET /stripe/retrieve_session` | 是 | 查询 Session 状态 |
| `POST /stripe/webhook` | 否（靠签名） | 所有 Stripe 事件统一入口 |

## signMode 双模

| 模式 | endpoint 谁建 | 开发者交什么 | 云函数做什么 |
|---|---|---|---|
| `gateway`（默认） | 平台代建 | 只交 `sk` | 读集成中心已验签明文，直接处理 |
| `sdk` | 开发者自建 | `sk` + `whsec` | `stripe.webhooks.constructEvent()` 自验签 |

## 下单示例

```bash
curl -X POST https://<环境域名>/stripe/create_session \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 20.00,
    "currency": "usd",
    "productName": "Pro 套餐",
    "client_reference_id": "ORDER_123"
  }'
```

响应：

```json
{ "code": 0, "msg": "success", "data": { "sessionId": "cs_test_...", "url": "https://checkout.stripe.com/..." } }
```

前端拿到 `url` 后 `window.location.href = url` 跳转托管收银台。

## ⚠️ 关键注意事项

1. **验签必须用原始 raw body**。`app.js` 用 `express.json({ verify })` 把原始字符串存到 `req.rawBody`，webhook 直接用它。任何 `JSON.parse` → `stringify` 都会让签名失效。
2. **必须先返回 2xx 再做业务**。非 2xx 会触发 Stripe 重试（live 模式最长 3 天指数退避）。
3. **必须按 `event.id` 幂等**。Stripe 不保证只投递一次，也不保证顺序。示例用内存 Set，生产请换成数据库 `event_id` 唯一索引。
4. **金额单位是最小货币单位**。`JPY` / `KRW` 等零小数币种不乘 100，模板已内置换算（`utils/currency.js`）。
5. **不要依赖 `success_url` 判断支付成功**。用户付款后可能直接关页面，最终状态以 webhook 为准。
6. **test / live 是两套完全独立的密钥和 endpoint**，whsec 不能混用。

## 与微信支付模板的差异

| 维度 | 微信支付 | Stripe |
|---|---|---|
| 凭证 | 7 项（含 PEM 私钥、证书序列号） | 2 项（sk + whsec） |
| 回调报文 | 密文，AES-GCM 解密 | 明文 JSON，仅 HMAC 验签 |
| 回调路由 | 支付/退款/转账三条 | 单条，按 `event.type` 分发 |
| 用户身份 | `x-wx-openid` 平台注入 | JWT（CloudBase Auth） |
| 支付调起 | `wx.requestPayment` | 跳转托管页 URL |

## 本地开发

```bash
cp .env.example .env   # 填入测试密钥
npm install
npm test               # 单元测试
npm start              # 默认 3000 端口
```

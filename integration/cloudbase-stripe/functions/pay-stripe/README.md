# pay-stripe

Stripe Checkout 支付云函数模板。回调**一律由云函数用 `stripe-signature` 自验签**（`stripe-pay` 集成的 `system` 声明不生效）。

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
| `stripeWebhookSecret` | `ownservice` 时必填 | `whsec_`，endpoint 创建时只返回一次 |
| `stripeApiVersion` | 强烈建议 | 如 `2026-08-26.dahlia`，锁定避免 Stripe 升级导致静默失效 |
| `stripeSuccessUrl` | 否 | 支付成功跳转地址，前端传值优先；回跳后要查单须带占位符 `{CHECKOUT_SESSION_ID}` |
| `stripeCancelUrl` | 否 | 取消支付跳转地址 |
| `stripeAllowedReturnDomains` | 否（强烈建议） | 回跳域名白名单（多个逗号分隔，写域名如 `example.com`）；配了才强制校验前端传入的 `success_url` / `cancel_url` |
| `corsAllowOrigin` | 否 | 跨域白名单，多个逗号分隔 |

## 路由

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /stripe/create_session` | 是 | 创建 Session，返回 `{ sessionId, url }` |
| `POST|GET /stripe/retrieve_session` | 是 | 查询 Session 状态 |
| `POST /stripe/webhook` | 否（靠签名） | 所有 Stripe 事件统一入口 |

## 鉴权

写接口只认**一个**服务端可验证的身份来源：

| 来源 | 场景 | 函数内校验 |
|---|---|---|
| `Authorization: Bearer <JWT>` | Web / App（CloudBase Auth accessToken） | 解码 payload，校验 `sub` 存在、`exp` 未过期、`iss`（配了 `AUTH_EXPECTED_ISSUER` 才校验） |

客户端能自己填的东西一律不作为依据，以下分支**已删除**（曾经是假保护）：
`x-tcb-integration-id`、`x-wx-source`、`x-authmethod`、`TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`（云函数内恒存在 = 无条件放行）、
`x-wx-openid`（只有 10-64 位字符的格式校验，没有来源证明；函数一旦有公网直连路径，`curl -H 'x-wx-openid: attacker001'` 即可冒用身份下单）。

本地联调要放开匿名调用，显式设 `ALLOW_ANONYMOUS_DEV=true`（默认关闭，放行时会打 warn，`source` 标记为 `anonymous-dev`）。
回调 `/stripe/webhook` 不挂鉴权中间件，由 `stripe-signature` 保证可信。

## 回调验签：一律由云函数自验签

`stripe-pay` 集成**不做网关代验签**。2026-11-05 实测（环境 `lowcode-0gwpl9v4125156ef`）：

- 不带 `stripe-signature` 的请求也会被网关直接转发到函数并返回 200
- 转发的 body 是 Stripe 原始事件（`id` / `object` / `api_version` / `data` / `type` …），
  没有 `ParsedContent` / `ParsedNotify` 明文包装

所以本项目只保留一条可信路径：**`stripe.webhooks.constructEvent()` 验签**。

`services/stripeService.js` 的 `handleWebhook` 判定：

| 条件 | 处理 |
|---|---|
| 无 `stripe-signature` | 直接 400（不采信任何明文） |
| 有签名但缺 `rawBody` | 400 |
| 验签失败 | 400 |
| 验签通过 | 继续做结构 / 业务字段 / 幂等校验 |

模板不再读取任何回调类型声明（`notifyURLCallbackType` 已移除）；`stripeWebhookSecret` 必填。

> 🚨 不要为了让回调「看起来能过」而信任 `body.ParsedContent`：网关原样透传时，
> 任何人都能 POST 一段 `{"type":"checkout.session.completed","ParsedContent":{...}}`
> 把订单标成已支付。这条路径在本模板里已被删除。

> 🚨 平台若仍注入 `notifyURLCallbackType`，代码会直接忽略它 —— 它不再是任何验签判定的依据。

> 取到事件后还要过结构校验：`event.id` + `event.type` + `event.data.object` +
> `event.data.object.id` 缺一不可。

> 🚨 云 API 适配层（`app.js`）只对事件类型做**形态校验**（`^[a-z0-9_]+(\.[a-z0-9_]+)+$`，各段都允许下划线），
> 形态非法直接 400；形态合法但未订阅的事件交回 `handleWebhook` 优雅忽略（回 200），
> 不能用 `EVENT_SEMANTICS` 的键当路由白名单 —— endpoint 订阅哪些事件是在 Stripe 后台独立配置的，
> 误杀合法投递会让 Stripe 指数退避重试最长 3 天甚至停用 endpoint。

## 下单示例

```bash
curl -X POST https://<环境域名>/stripe/create_session \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 2000,
    "currency": "usd",
    "productName": "Pro 套餐",
    "client_reference_id": "ORDER_123"
  }'
```

`amount` 是最小货币单位整数（2000 = $20.00），与 Stripe API 一致；主单位写法用 `amount_major: 20.00`，两者只能传一个。

响应：

```json
{ "code": 0, "msg": "success", "data": { "sessionId": "cs_test_...", "url": "https://checkout.stripe.com/..." } }
```

前端拿到 `url` 后 `window.location.href = url` 跳转托管收银台。

## ⚠️ 关键注意事项

1. **验签必须用原始 raw body**。`app.js` 用 `express.json({ verify })` 把原始字符串存到 `req.rawBody`，webhook 直接用它。任何 `JSON.parse` → `stringify` 都会让签名失效。
2. **必须先返回 2xx 再做业务**。非 2xx 会触发 Stripe 重试（live 模式最长 3 天指数退避）。
3. **必须按 `event.id` 幂等**。Stripe 不保证只投递一次，也不保证顺序。示例用内存 Set，生产请换成数据库 `event_id` 唯一索引。
4. **`amount` 就是最小货币单位整数**（$20.00 传 `2000`），不再由服务端乘 100；零小数币种（JPY / KRW）直接传日元 / 韩元整数。要传主单位（`20.00`）用 `amount_major`，服务端才做换算，两者同时传直接 400。历史上 `amount` 曾是主单位，按新口径传 `2000` 到旧版本会变成 $2000。
5. **不要依赖 `success_url` 判断支付成功**。用户付款后可能直接关页面，最终状态以 webhook 为准。
6. **test / live 是两套完全独立的密钥和 endpoint**，whsec 不能混用。
7. **`{CHECKOUT_SESSION_ID}` 只在 `success_url` 里会被替换**。写进 `cancel_url` 会拿到未替换的字面量，回跳后拿着它查单必然失败（`examples/web/index.html` 的 `cancel_url` 不带占位符，并对 `session_id` 做了 `^cs_` 校验）。
8. **下单入参不只过字段名白名单，还校验取值**：`amount` 必须为正整数（最小货币单位）、`amount_major` 必须为正数且换算后仍是正整数、`quantity` 正整数、`currency` 三位字母、`client_reference_id` 限 `^[A-Za-z0-9_-]{1,64}$`、回跳 URL 必须 http/https（配了 `stripeAllowedReturnDomains` 还要命中域名白名单），不合法直接 400。
9. **`client_reference_id` 必填**。它是 webhook 反查订单的唯一键：`checkout.session.*` 事件缺这个字段会被 `_isValidBizObject` 判成「缺业务主键」拒收（回 400，Stripe 反复重试），表现为「下单成功、回调永远到不了、订单停在未支付」。所以 `create_session` 在参数校验之后就直接 400，不等到回调阶段才发现。
   - `amount` / `amount_major` / `quantity` 先做类型守卫：`true` / `[5]` / `{}` 这类非数字一律拒绝（否则 `Number(true)===1` 会被当成 1 美元下单）。
   - `metadata` 必须是对象，非对象直接 400（不静默改写成 `{}`，否则业务字段被丢掉还拿不到报错）。
   - `line_items` 逐项深度校验（≤50 项）：`price_data.unit_amount` 必须为正整数（最小货币单位，挡住 0 元 / 负金额单）、`currency` 三位字母、`quantity` 正整数、`product_data.name` 字符串且不超 200 字符。

## 本地开发

```bash
cp .env.example .env   # 填入测试密钥
npm install
npm test               # 单元测试
npm start              # 默认 3000 端口
```

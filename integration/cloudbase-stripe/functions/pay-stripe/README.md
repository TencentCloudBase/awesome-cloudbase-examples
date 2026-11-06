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
│   ├── lineItems.js            line_items 白名单校验与净化（controller / service 共用）
│   └── cloudbaseAuth.js        网关身份解析（x-userid / x-authmethod）
├── tests/                      单元测试
├── Dockerfile / .dockerignore  云托管镜像（.dockerignore 挡住 .env，密钥不进镜像）
└── scf_bootstrap               云函数启动脚本
```

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `stripeSecretKey` | 是 | `sk_live_` / `sk_test_`，建议用受限密钥 `rk_` |
| `stripeWebhookSecret` | **是** | `whsec_`，endpoint 创建时只返回一次；回调一律由本函数验签，缺失时所有回调 400 |
| `stripeApiVersion` | 强烈建议 | 如 `2026-08-26.dahlia`，锁定避免 Stripe 升级导致静默失效 |
| `stripeSuccessUrl` | 否 | 支付成功跳转地址，**前端传值优先**，这里只是兜底；回跳后要查单须带占位符 `{CHECKOUT_SESSION_ID}` |
| `stripeCancelUrl` | 否 | 取消支付跳转地址，同样前端传值优先 |
| `stripeAllowedReturnDomains` | 否 | 回跳域名白名单（逗号分隔，只写域名如 `example.com`）。**不配 = 只校验 http/https**，回跳地址以调用方为准；配了才强制命中 |
| `corsAllowOrigin` | 否 | 跨域白名单，多个逗号分隔（`app.js` 读取，缺失时浏览器侧被 CORS 拦掉） |
| `AUTH_EXPECTED_ISSUER` | 否 | 期望的 JWT 签发方。仅影响 `email` 回填校验，**不参与鉴权** |
| `ALLOW_ANONYMOUS_DEV` | 否 | 仅本地联调。`true` 时放行未认证调用并打 warn；**云函数 / 云托管运行时该开关被直接忽略**（配置写错带到线上也不会放行） |

> 本地调试专用变量（`PORT` / `ALLOW_ANONYMOUS_DEV`）不会被部署到云端。

## 路由

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /stripe/create_session` | 是 | 创建 Session，返回 `{ sessionId, url }` |
| `POST /stripe/retrieve_session`<br>`GET /stripe/retrieve_session` | 是 | 查询 Session 状态 |
| `POST /stripe/create_refund` | 是 | 发起退款：`{ session_id, amount?, reason?, idempotency_key? }` |
| `POST /stripe/webhook` | 否（靠签名） | 所有 Stripe 事件统一入口 |

> `retrieve_session` / `create_refund` 都校验资源归属：比对 Session 的 `metadata.cloudbaseUid` 与当前登录 uid，不一致返回 **404**（不是 403，避免被当成 session_id 探测通道），且不回传 Stripe 原始 `raw` 对象。

退款只支持按 `session_id` 发起（Session 上带服务端写入的归属，才能证明「这单是你的」）：

- `amount` 不传 = 退剩余全部；传了必须是正整数（最小货币单位），且不能超过原支付金额。
- `reason` 仅 `duplicate` / `fraudulent` / `requested_by_customer`。
- `idempotency_key` 可选，网络重试时 Stripe 返回同一笔退款，不会重复退。
- 只对 `payment_status=paid` 的 Session 生效；接口返回 `succeeded` 仅代表 Stripe 已受理，
  **最终以 Webhook `charge.refunded` 为准**（异步退款到账前状态仍可能变化）。

> **退款回调前置条件**：Stripe Dashboard → Developers → Webhooks → 选中 endpoint →
> 勾选 `charge.refunded`（`charge.dispute.created` 同理）。不订阅就收不到回调，
> 退款单只能靠主动查单对账。

## 鉴权

写接口只认**网关注入的已认证身份**，函数侧不做 JWT 解码：

| header | 含义 | 函数内校验 |
|---|---|---|
| `x-userid` | 网关注入的已认证用户标识 | 必须存在且形态合法（3-128 位） |
| `x-authmethod` | 网关鉴权方式 | 必须存在且不为 `UNAUTHORIZED` |

两个头同时满足才放行。

> ⚠️ 客户端伪造这两个头无效：2026-11-05 实测，从回调入口（身份认证关闭）主动伪造
> `x-userid` / `x-usertype` / `x-administrator`，函数收到的是 `x-userid: null`、
> `x-authmethod: UNAUTHORIZED` —— 网关会覆盖客户端自带的同名 header。

**业务接口必须从「网关鉴权入口」调用**，否则一律 401：

| 入口 | 鉴权 |
|---|---|
| 云 API：`https://<envId>.api.tcloudbasegateway.com/v1/functions/pay-stripe` | 网关验 `Authorization: Bearer <accessToken>`；业务动作放 body 的 `_action`，不要拼 `/stripe/xxx` 路径 |
| 自定义域名路由 | 必须在路由上**开启身份认证**（关闭时网关不注入身份 → 401） |
| 集成回调域名 | 身份认证关闭，只能承载 webhook，**不能**当业务入口 |

> 🚨 **为什么不再解码 Bearer JWT**：函数侧拿不到 CloudBase Auth 的验签公钥（JWKS 端点返回 401），
> 只 base64 解码 payload 等于假鉴权 —— `Authorization: Bearer x.<自己拼的payload>.y` 就能冒用任意 uid。
> `Authorization` 目前只用于回填 `customer_email`，且要求其主体与 `x-userid` 一致。

以下分支**已删除**（曾经是假保护）：
`x-tcb-integration-id`、`x-wx-source`、`TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`（云函数内恒存在 = 无条件放行）、
`x-wx-openid`（只有格式校验，没有来源证明，`curl -H` 即可伪造）。

本地联调要放开匿名调用，显式设 `ALLOW_ANONYMOUS_DEV=true`（默认关闭，放行时会打 warn，`source` 标记为 `anonymous-dev`）。
检测到云端运行时（`TENCENTCLOUD_RUNENV` / `SCF_RUNTIME` / `KUBERNETES_SERVICE_HOST`）时，
该开关会被直接忽略并打日志 —— 不依赖「生产别开」这句文档约定。
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
# 云 API 入口：业务动作放 body._action，鉴权由网关完成
curl -X POST 'https://<envId>.api.tcloudbasegateway.com/v1/functions/pay-stripe' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{
    "_action": "create_session",
    "amount": 2000,
    "currency": "usd",
    "productName": "Pro 套餐",
    "client_reference_id": "ORDER_123"
  }'

# 自定义域名 + /stripe/* 路由（该路由需开启身份认证）
curl -X POST https://<你的域名>/stripe/create_session \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <accessToken>' \
  -d '{ "amount": 2000, "currency": "usd", "productName": "Pro 套餐", "client_reference_id": "ORDER_123" }'
```

> 🚨 不带 `Authorization` 会被网关/函数直接拒成 401。`accessToken` 由 CloudBase Auth 登录后获取。

`amount` 是最小货币单位整数（2000 = $20.00），与 Stripe API 一致；主单位写法用 `amount_major: 20.00`，两者只能传一个。

响应：

```json
{ "code": 0, "msg": "success", "data": { "sessionId": "cs_test_...", "url": "https://checkout.stripe.com/..." } }
```

前端拿到 `url` 后 `window.location.href = url` 跳转托管收银台。

## ⚠️ 关键注意事项

1. **验签必须用原始 raw body**。`app.js` 用 `express.json({ verify })` 把原始字符串存到 `req.rawBody`，webhook 直接用它。任何 `JSON.parse` → `stringify` 都会让签名失效。
2. **必须先返回 2xx 再做业务**。非 2xx 会触发 Stripe 重试（live 模式最长 3 天指数退避）。
3. **幂等键是 `event.id + type`，不是单独的 `event.id`**。Stripe 不保证只投递一次，也不保证顺序。示例用进程内 `Set`（带 5000 条上限、多实例不共享、冷启动丢失），生产请换成数据库 `(event_id, type)` 唯一索引，且与业务落库同一事务。去重键只在「事件语义已订阅 + 业务字段校验通过」之后写入，未订阅事件不占位。
4. **`amount` 就是最小货币单位整数**（$20.00 传 `2000`），不再由服务端乘 100；零小数币种（JPY / KRW）直接传日元 / 韩元整数。要传主单位（`20.00`）用 `amount_major`，服务端才做换算，两者同时传直接 400。历史上 `amount` 曾是主单位，按新口径传 `2000` 到旧版本会变成 $2000。
5. **不要依赖 `success_url` 判断支付成功**。用户付款后可能直接关页面，最终状态以 webhook 为准。
6. **test / live 是两套完全独立的密钥和 endpoint**，whsec 不能混用。
7. **`{CHECKOUT_SESSION_ID}` 只在 `success_url` 里会被替换**。写进 `cancel_url` 会拿到未替换的字面量，回跳后拿着它查单必然失败（`examples/web/index.html` 的 `cancel_url` 不带占位符，并对 `session_id` 做了 `^cs_` 校验）。
8. **下单入参不只过字段名白名单，还校验取值**：`amount` 必须为最小货币单位的正整数且 ≤ `999999999`、`amount_major` 必须为正数且换算后仍是正整数、`quantity` 正整数且 ≤ `999999`、`currency` 三位字母、`client_reference_id` 限 `^[A-Za-z0-9_-]{1,64}$`、回跳 URL 必须 http/https（配了 `stripeAllowedReturnDomains` 还要命中域名白名单），不合法直接 400。
   - 字符串金额只认十进制字面量：`'0x10'` / `'1e3'` / `'+9.9'` 一律拒绝（否则 `Number('0x10')===16` 会让金额悄悄放大）。
   - `amount` 换算成最小货币单位后必须 > 0：挡住 `0.001 usd → 0` 的 0 元单；零小数币种（JPY）不接受小数。
9. **`client_reference_id` 必填**。它是 webhook 反查订单的唯一键：`checkout.session.*` 事件缺这个字段会被 `_isValidBizObject` 判成「缺业务主键」拒收（回 400，Stripe 反复重试），表现为「下单成功、回调永远到不了、订单停在未支付」。所以 `create_session` 在参数校验之后就直接 400，不等到回调阶段才发现。
   - `amount` / `amount_major` / `quantity` 先做类型守卫：`true` / `[5]` / `{}` 这类非数字一律拒绝（否则 `Number(true)===1` 会被当成 1 美元下单）。
   - `metadata` 必须是对象，非对象直接 400（不静默改写成 `{}`，否则业务字段被丢掉还拿不到报错）。
   - `line_items` 逐项深度校验（≤50 项），支持两种 Stripe 形态，二选一：
     - `price_data`（现造价格）：`unit_amount` 正整数且 ≤ `999999999`、`currency` 三位字母、`quantity` 正整数、`product_data.name` 不超 200 字符、`product_data.description` 不超 500 字符、`product_data.images` ≤8 个 https 地址；`recurring.interval` 仅 `day/week/month/year`；`tax_behavior` 仅 `inclusive/exclusive`。
     - `price`（引用已有 Price ID）：必须是 `price_` 开头的字符串。
   - `mode=subscription` 时 `line_items[].price_data.recurring` 必填；非 subscription 模式带 `recurring` 直接 400。
   - `mode=setup` 只收集支付方式、不扣款：**不能传** `amount` / `amount_major` / `line_items` / `currency` / `quantity`，带了直接 400（`currency` / `quantity` 会被下游静默丢弃，声明值不生效）；三种托管模式的 `success_url` 都必填。
   - `line_items` 与 `amount` / `amount_major` / `quantity` / `currency` **互斥**（币种写在每项 `price_data.currency`，顶层 `currency` 会被静默丢弃，所以直接拒绝）。
   - `metadata` 必须是对象，值只支持字符串/数字且每个值 ≤500 字符（Stripe 限制）；登录态 `cloudbaseUid` 在**校验前**注入，确保也过一遍校验。
   - 校验通过后按白名单重建 `line_items`（剥离 `adjustable_quantity` / `dynamic_tax_rates` 等未预期字段），并把币种统一小写；净化在 service 组装请求时执行，controller 的校验函数只读不写。
10. **退款回调需要在 Stripe 后台订阅 `charge.refunded`**。本模板已把它映射为 `{ biz: 'refund', state: 'REFUNDED' }`，走同一个 `/stripe/webhook` 自动验签；没订阅就收不到，退款单只能靠主动查单对账。异步退款方式（银行转账等）的到账状态变化用 `refund.updated`，模板未订阅，需要时自行加进 `EVENT_SEMANTICS` 与后台订阅列表。

## 本地开发

```bash
cp .env.example .env   # 填入测试密钥
npm install
npm test               # 单元测试（不需要真实密钥，不联网）

# 🚨 代码只读 process.env，**没有 dotenv**：.env 不会被自动加载
set -a && . ./.env && set +a     # bash / zsh
npm start                        # 默认 3000 端口，PORT 可覆盖
```

> 直接 `npm start` 而不手动 export 时，取不到任何密钥：启动校验会告警，下单和验签都会失败。
> Docker 场景改用 `docker run --env-file .env ...`。

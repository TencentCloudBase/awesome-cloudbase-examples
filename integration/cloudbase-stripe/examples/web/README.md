# Web 示例（Checkout Session 下单与退款）

单文件示例，零依赖：打开页面 → 填金额 → 跳 Stripe 托管收银台 → 支付后回跳并自动查询状态 →
在页面下方可选发起退款。

链路：

```
① 页面 POST /stripe/create_session（Bearer token）
② 服务端用 stripeSecretKey 直连 Stripe 创建 Session → 返回 { sessionId, url }
③ 浏览器 location.href = url，在 Stripe 收银台支付
④ 支付成功 → Stripe webhook → 云函数（以服务端为准）
⑤ 浏览器回跳本页（?session_id=cs_xxx）→ POST /stripe/retrieve_session 查真实状态
⑥ 可选：页面 POST /stripe/create_refund（session_id + 可选 amount/reason）
```

## 前置条件

| 项 | 要求 |
|---|---|
| 云函数 | 已部署 `functions/pay-stripe`，拿到访问地址 |
| 凭证 | `stripeSecretKey` 已配（测试用 `sk_test_`） |
| 跨域 | 函数环境变量配 `corsAllowOrigin` = 本页 origin（如 `http://localhost:5173`） |
| 登录态 | CloudBase Auth 的 accessToken（经网关校验后注入 `x-userid` / `x-authmethod`，函数不解 JWT） |
| 订单号 | `client_reference_id` 必填（回调按它反查订单），页面留空时会自动生成 `order_<会话标签>_<随机串>` |

## 跑起来

```bash
# 1. 起静态服务（任选其一）
cd integration/cloudbase-stripe/examples/web
npx serve .          # 或 python3 -m http.server 5173

# 2. 浏览器打开打印出的地址（如 http://localhost:5173）
# 3. 填 API Base + Bearer token + 金额，点「创建 Session 并跳转支付」
```

## 发起退款

支付回跳后 `session_id` 会自动填进退款区块，也可以手工粘贴：

| 字段 | 说明 |
|---|---|
| Session ID | 必填；服务端按 `metadata.cloudbaseUid` 校验归属，只能退自己的单，不一致返回 404 |
| 退款金额 | 留空 = 退剩余全部；填了必须是最小货币单位正整数且不超过原支付金额 |
| 退款原因 | `requested_by_customer` / `duplicate` / `fraudulent` |

约束：

- 只对 `payment_status=paid` 的 Session 生效，未支付 / 已全额退款的单会被本地拦截。
- 接口返回 `succeeded` 即退款成功；**账务状态以 Webhook `charge.refunded` 落库为准**（异步退款方式可能先 `pending`）。
- 需要在 Stripe Dashboard → Developers → Webhooks 勾选 `charge.refunded`，否则收不到退款回调，
  只能靠主动查单对账。
- 支持多次部分退款：本地只校验「不超过原支付金额」，**实际剩余可退金额由 Stripe 校验**
  （已退过一部分后再退超额，会收到 Stripe 的 400）；可传 `idempotency_key` 避免网络重试重复退。

## URL 参数：只用于自动登录

| 参数 | 作用 |
|---|---|
| `?envId=<环境ID>` | 加载 CloudBase JS SDK，尝试静默登录并自动填入 accessToken |

示例：

```
http://localhost:5173/?envId=lowcode-xxx
```

行为说明：

- 🚨 **接口地址不从 URL 读取**：`?apiBase=` 由链接构造者控制，页面又会带登录态请求它，
  别人发一条 `?apiBase=https://evil.example&envId=xxx` 就能让页面把 accessToken 发到第三方域名。
  地址只从同源 localStorage 恢复（下单时记住），首次进入需要手动填。
- `envId` 会做形态校验并记住，刷新 / 回跳后继续自动登录。
- 带 `envId` 但当前浏览器没有该环境的登录态：提示「未检测到登录态」，并显示「匿名登录」按钮（需在控制台开启匿名登录）。
- SDK 是动态加载的，不带 `envId` 时页面不会请求任何外部脚本。
- Stripe 回跳只带 `?session_id=cs_xxx`，不再携带接口地址与 envId。

测试卡：`4242 4242 4242 4242`，任意未来日期，任意 3 位 CVC。测试环境不会真实扣款。

## 部署到静态托管

`cloudbaserc.json` 的 `app` 段已声明本示例：

```bash
cd integration/cloudbase-stripe
tcb app deploy pay-stripe-demo
```

地址为 `https://<环境默认域名>/pay-stripe-demo/`，之后把云函数的 `corsAllowOrigin` 配成该 origin。

## 常见报错

| 现象 | 原因 | 处理 |
|---|---|---|
| `401 未授权访问` | 没带 Bearer token，或 token 过期 | 重新登录拿 accessToken |
| 请求失败但函数无日志 | 跨域被拦（缺 `corsAllowOrigin` 或 origin 不匹配） | 函数环境变量配好白名单并重启实例 |
| `缺少 success_url` | 没传 `success_url` 且未配 `stripeSuccessUrl` | 前端传值，或配环境变量 |
| 回跳后 `status: unpaid` | webhook 还没到（正常，Stripe 回跳与 webhook 有先后差） | 等几秒刷新，或以 webhook 落库结果为准 |

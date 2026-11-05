# Web 示例（Checkout Session）

单文件示例，零依赖：打开页面 → 填金额 → 跳 Stripe 托管收银台 → 支付后回跳并自动查询状态。

链路：

```
① 页面 POST /stripe/create_session（Bearer token）
② 服务端用 stripeSecretKey 直连 Stripe 创建 Session → 返回 { sessionId, url }
③ 浏览器 location.href = url，在 Stripe 收银台支付
④ 支付成功 → Stripe webhook → 云函数（以服务端为准）
⑤ 浏览器回跳本页（?session_id=cs_xxx）→ POST /stripe/retrieve_session 查真实状态
```

## 前置条件

| 项 | 要求 |
|---|---|
| 云函数 | 已部署 `functions/pay-stripe`，拿到访问地址 |
| 凭证 | `stripeSecretKey` 已配（测试用 `sk_test_`） |
| 跨域 | 函数环境变量配 `corsAllowOrigin` = 本页 origin（如 `http://localhost:5173`） |
| 登录态 | CloudBase Auth 的 accessToken（函数侧鉴权只认 Bearer JWT 或平台注入头） |
| 订单号 | `client_reference_id` 必填（回调按它反查订单），页面留空时会自动生成 `order_<时间戳>` |

## 跑起来

```bash
# 1. 起静态服务（任选其一）
cd integration/cloudbase-stripe/examples/web
npx serve .          # 或 python3 -m http.server 5173

# 2. 浏览器打开打印出的地址（如 http://localhost:5173）
# 3. 填 API Base + Bearer token + 金额，点「创建 Session 并跳转支付」
```

## URL 参数：省掉手填

| 参数 | 作用 |
|---|---|
| `?apiBase=https://<envId>.service.tcloudbase.com/pay-stripe` | 预填云函数地址 |
| `&envId=<环境ID>` | 加载 CloudBase JS SDK，尝试静默登录并自动填入 accessToken |

示例：

```
http://localhost:5173/?apiBase=https://lowcode-xxx.service.tcloudbase.com/pay-stripe&envId=lowcode-xxx
```

行为说明：

- 只带 `apiBase`：仅预填地址，token 仍需手填。
- 带 `envId` 但当前浏览器没有该环境的登录态：提示「未检测到登录态」，并显示「匿名登录」按钮（需在控制台开启匿名登录）。
- SDK 是动态加载的，不带 `envId` 时页面不会请求任何外部脚本。

测试卡：`4242 4242 4242 4242`，任意未来日期，任意 3 位 CVC。测试环境不会真实扣款。

## 部署到静态托管

根目录 `cloudbaserc.json` 的 `hosting[]` 已包含本示例：

```bash
cd integration/cloudbase-stripe
tcb deploy --only hosting
```

地址为 `https://<环境默认域名>/pay-stripe-demo/`，之后把云函数的 `corsAllowOrigin` 配成该 origin。

## 常见报错

| 现象 | 原因 | 处理 |
|---|---|---|
| `401 未授权访问` | 没带 Bearer token，或 token 过期 | 重新登录拿 accessToken |
| 请求失败但函数无日志 | 跨域被拦（缺 `corsAllowOrigin` 或 origin 不匹配） | 函数环境变量配好白名单并重启实例 |
| `缺少 success_url` | 没传 `success_url` 且未配 `stripeSuccessUrl` | 前端传值，或配环境变量 |
| 回跳后 `status: unpaid` | webhook 还没到（正常，Stripe 回跳与 webhook 有先后差） | 等几秒刷新，或以 webhook 落库结果为准 |

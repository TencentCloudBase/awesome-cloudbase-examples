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

## 跑起来

```bash
# 1. 起静态服务（任选其一）
cd integration/cloudbase-stripe/examples/web
npx serve .          # 或 python3 -m http.server 5173

# 2. 浏览器打开打印出的地址（如 http://localhost:5173）
# 3. 填 API Base + Bearer token + 金额，点「创建 Session 并跳转支付」
```

测试卡：`4242 4242 4242 4242`，任意未来日期，任意 3 位 CVC。测试环境不会真实扣款。

## 常见报错

| 现象 | 原因 | 处理 |
|---|---|---|
| `401 未授权访问` | 没带 Bearer token，或 token 过期 | 重新登录拿 accessToken |
| 请求失败但函数无日志 | 跨域被拦（缺 `corsAllowOrigin` 或 origin 不匹配） | 函数环境变量配好白名单并重启实例 |
| `缺少 success_url` | 没传 `success_url` 且未配 `stripeSuccessUrl` | 前端传值，或配环境变量 |
| 回跳后 `status: unpaid` | webhook 还没到（正常，Stripe 回跳与 webhook 有先后差） | 等几秒刷新，或以 webhook 落库结果为准 |

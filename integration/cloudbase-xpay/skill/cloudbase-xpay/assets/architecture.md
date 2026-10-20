# xpay-common 架构

## 端到端流程

```
┌──────────┐  ① wx.login() → code
│  小程序   │
└────┬─────┘
     │ ② callHTTPFunction('/xpay/create_order', { code, productId, goodsPrice })
     ▼
┌──────────────────────────────────────────────┐
│  xpay-common 云函数                            │
│  ┌────────────┐   ┌────────────────────┐     │
│  │ controller │──▶│ xpayService        │     │
│  │ (下单/查单) │   │  ├ code2Session    │─────┼──▶ 微信 sns/jscode2session
│  └────────────┘   │  ├ buildSignData   │     │         → sessionKey
│                   │  └ signForClient   │     │
│                   └────────────────────┘     │
│                      paySig + signature      │
└────┬─────────────────────────────────────────┘
     │ ③ 返回 payData
     ▼
┌──────────┐  ④ wx.requestVirtualPayment({ signData, mode, paySig, signature })
│  小程序   │     客户端自行完成下单与收银台拉起
└────┬─────┘
     │ ⑤ 支付成功
     ▼
┌──────────┐  ⑥ 事件推送
│ 微信平台  │
└────┬─────┘
     ▼
┌──────────────────────────────────────────┐
│ 集成中心回调网关                            │
│  ① 来源认证  ② 拉取集成信息                 │
│  ③ 验签     ④ 解密（AES-256-CBC）          │
│  ⑤ 写入 header → 转发                      │
└────┬─────────────────────────────────────┘
     │ 明文
     ▼
┌──────────────────────────────────────────┐
│ xpay-common /xpay/callback                │
│   handleCallback → 按 Event 分发           │
│   幂等（wx_order_id）→ 发货/回收/记录       │
│   应答 { ErrCode: 0, ErrMsg: 'success' }  │
└──────────────────────────────────────────┘
```

## 模块职责

| 模块 | 职责 |
|---|---|
| `app.js` | Express 装配，JSON + XML 双格式，云 API 适配，事件→路由映射 |
| `config/config.js` | 凭证读取、启动自检（`env` 固定 `0`，仅现网） |
| `routes/xpay.js` | 路由表，业务路由与回调路由均不挂本地鉴权（依赖上游网关） |
| `controllers/xpayController.js` | 下单/查单、回调应答、统一响应 |
| `services/xpayService.js` | 下单、6 类事件分发、幂等、iOS 退款决策 |
| `services/signService.js` | **双签名**（signData 构造 + paySig + signature） |
| `services/strategies/xpayStrategy.js` | `/xpay/*` B 端接口封装 |
| `utils/wechatApi.js` | code2Session、access_token（带缓存） |
| `utils/xml.js` | XML 推送解析 |
| `utils/cloudbaseAuth.js` | 读平台注入的 `x-wx-openid` / `x-wx-appid` |

## 关键设计

### 1. 服务端不参与下单

与普通支付相反：服务端只出签名，客户端 `wx.requestVirtualPayment` 自行完成下单。
因此 `create_order` **不调用任何微信下单接口**，是纯本地计算。

### 2. 签名只收字符串

`signForClient(signData: string, ...)` / `signForServer(uri, postBody: string, ...)` ——
从接口签名上杜绝 `JSON.parse` → `stringify` 重排键顺序。

### 3. 回调查询：网关托管 / 自建两种落法

走小程序消息推送，验签解密在哪儿做，取决于 `notifyUrlCallbackType`：

| 值 | URL 谁提供 | 验签解密 |
|---|---|---|
| `system` | 平台生成（集成中心托管） | 100% 在网关，业务代码只有明文 |
| `ownservice` | 用户自己在【虚拟支付 → 基本配置 → 基础配置 → 发货推送配置】填 | 业务函数自己验，模板 `app.js` 已内置 |

平台这三个声明字段（`notifyUrlCallbackType` / `notifyUrlResourceType` / `msgEncryptType`）读不到时，**按「自己验签」处理（fail closed）**。

> 🚨 不能退回「`token` 是否配置」去猜：漏配 token 是常见误操作，
> 猜成「网关代验签」的代价是任何人都能 POST 一段 JSON 伪造发货推送。
> 要免验签必须在平台上明确声明 `notifyUrlCallbackType=system`。

> 与 Stripe 的 `signMode` 的区别：Stripe 必须显式声明模式，因为网关代验签后的 body 与自验签后的明文字段无法区分；微信这边 `Encrypt` / `echostr` / `encrypt_type` 是请求自带标记，可自动判定。

### 4. 应答格式跟随请求

以 `content-type` 判断，`notifyFormat` 仅兜底。格式不一致会被重推 15 次。

## 数据流：双签名

```
signData (原样字符串)
    ├──▶ HMAC-SHA256(AppKey,     "requestVirtualPayment&" + signData) → paySig
    └──▶ HMAC-SHA256(sessionKey,                            signData) → signature
```

`sessionKey` 由 `code2Session(appId, appSecret, code)` 换取，code 来自前端 `wx.login()`。

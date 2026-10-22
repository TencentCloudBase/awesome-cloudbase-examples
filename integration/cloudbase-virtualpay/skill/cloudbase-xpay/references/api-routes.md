# 接口与路由

## 云函数路由（对外）

下表是**函数内路径**。完整 URL = HTTP 访问服务地址（含路径前缀）+ `/xpay/xxx`；
`wx.cloud.callHTTPFunction` 调用时只传函数名与参数，前缀由平台拼接。

| 路由 | 身份来源 | 入参 | 返回 |
|---|---|---|---|
| `POST /xpay/create_order` | 平台注入 `x-wx-openid`；`code2Session` 换出的权威 openid 必须与之相同 | `code`, `productId`, `goodsPrice`, `buyQuantity`, `mode`, `attach`, 可选 `outTradeNo` | `{ signData, mode, paySig, signature, outTradeNo, openid }` |
| `POST /xpay/query_order` | 同上 + 订单归属校验（`XPAY_GUARD=on` 时查不到单即拒绝） | `code`, `outTradeNo` | 订单详情 |
| `POST /xpay/callback` | `notifyUrlCallbackType=system` → 网关验签；`ownservice`/未声明 → 本函数自验签（fail closed） | 推送明文 | `{ ErrCode, ErrMsg }` |

统一响应：`{ code, msg, data }`，`code=0` 为成功。

## 集成中心网关回调链路（托管形态）

微信推送不直接进云函数，中间隔着集成中心网关：

```
微信 → https://<keyId>.integration-callback.tcloudbase.com/wechat/notify
     → 集成中心网关验签 + 解密
     → POST 云函数 /wechat/notify（明文）
     → 云函数应答 { ErrCode: 0 }
```

| 项 | 事实 |
|---|---|
| 转发路径 | 虚拟支付固定 `/wechat/notify`（`CALLBACK_URL_MAP.notifyUrl`）；微信支付是 `/wechatpay/order` |
| body 包装 | `ParsedContent`（微信支付风格）或 `ParsedNotify`（消息推送风格）—— **两种都必须认** |
| 免验签开关 | 只有 `notifyUrlCallbackType=system`。未注入时 fail-closed 按「自己验签」处理 → 网关明文没有 `signature` → 401 |
| 路径没注册路由 | 云 API 适配层兜底：识别出 `xpay_*` 事件后改写投递到 `/callback`，但仍强制 `req.pushVerified` |

> ⚠️ **最隐蔽的失败**：`pickEvent` 认得 `ParsedNotify`（所以适配层会把请求投递到 callback），
> 但业务取 `Event` 时只认 `ParsedContent` → 判成「缺少 Event」结构性错误 → 回 `ErrCode=0`
> → 微信不再重推 → **静默丢单**，日志里只有一条 error，没有任何 4xx/5xx。

排查顺序：

1. 日志有没有 `[云API适配] 路由分发: /callback` / `[Controller] 收到回调`
2. 看打出的 `has_parsed_content` / `has_parsed_notify` 哪个为 true
3. 启动日志 `[Callback] 判定:` 是「网关代验签」还是「本函数验签」

## 云 API 适配

云 API 调用 HTTP 云函数时 path 为 `/`，通过 `body._action` 传递路由：

```
_action = "create_order"       →  /create_order
_action = "xpay_create_order"  →  /create_order   （带前缀亦可，两种写法都支持）
_action = "query_order"        →  /query_order
Event 以 xpay_ 开头            →  /callback
```

> 适配层会把 `xpay_` 前缀归一化后再查白名单，所以 `create_order` 与 `xpay_create_order` 等价。
> 非法 action 返回 `400 不支持的操作`。

`ALLOWED_ACTIONS` 白名单：`create_order` / `query_order` / `callback`（**归一化后**的名字，不带 `xpay_` 前缀）。

## 微信服务端接口（`/xpay/*`）

通过 `XpayStrategy` 封装，业务侧不直接接触签名与密钥。

> ⚠️ **与上面的云函数路由同名但不同层**：这里的 `query_order` 是发往微信
> `api.weixin.qq.com` 的上游接口，由 `XpayStrategy` 调用；`/xpay/create_order` 才是本函数对外的路由。
> 两者都写作 `/xpay/xxx`，排查日志时看清是入站还是出站。

| 接口 | 方法 | 用途 |
|---|---|---|
| `/xpay/query_order` | `queryOrder` | 查询订单（现金单），兜底发货 |
| `/xpay/query_user_balance` | `queryUserBalance` | 查询代币余额 |
| `/xpay/currency_pay` | `currencyPay` | 扣减代币 |
| `/xpay/cancel_currency_pay` | `cancelCurrencyPay` | 代币支付退款 |
| `/xpay/present_currency` | `presentCurrency` | 代币赠送 |
| `/xpay/notify_provide_goods` | `notifyProvideGoods` | 通知已发货完成 |
| `/xpay/refund_order` | `refundOrder` | 启动退款任务（**iOS 不可用**） |
| `/xpay/download_bill` | `downloadBill` | 下载账单 |

调用方式：`POST https://api.weixin.qq.com{uri}?access_token={token}`

## 微信开放接口

| 接口 | 用途 |
|---|---|
| `sns/jscode2session` | code → sessionKey + openid |
| `cgi-bin/token` | 获取 access_token（模板带缓存，提前 5 分钟过期） |

## 完整接口清单

官方共 7 类（代币 / 道具 / 订单 / 账单 / 资金 / 广告金 / 投诉管控），
模板实现了常用的 8 个。完整清单见
[虚拟支付接口列表](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/)。

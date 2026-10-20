# 接口与路由

## 云函数路由（对外）

| 路由 | 鉴权 | 入参 | 返回 |
|---|---|---|---|
| `POST /xpay/create_order` | ✅ | `code`, `productId`, `goodsPrice`, `buyQuantity`, `mode`, `attach`, 可选 `outTradeNo` | `{ signData, mode, paySig, signature, outTradeNo, openid }` |
| `POST /xpay/query_order` | ✅ | `code`, `outTradeNo` | 订单详情 |
| `POST /xpay/callback` | ❌（网关验签） | 推送明文 | `{ ErrCode, ErrMsg }` |

统一响应：`{ code, msg, data }`，`code=0` 为成功。

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

`ALLOWED_ACTIONS` 白名单：`xpay_create_order` / `xpay_query_order` / `xpay_callback`。

## 微信服务端接口（`/xpay/*`）

通过 `XpayStrategy` 封装，业务侧不直接接触签名与密钥。

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

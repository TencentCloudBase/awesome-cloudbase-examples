# 小程序虚拟支付示例（xpay-common）

演示「道具直购 / 代币充值」的完整链路：`wx.login` → 云函数出签名 → `wx.requestVirtualPayment` 拉起收银台 → 查单兜底。

## 前置条件

| 项 | 要求 |
|---|---|
| 基础库 | ≥ 3.15.2（`callHTTPFunction`） |
| `wx.requestVirtualPayment` | ≥ 2.19.2 |
| iOS 端 | 微信 ≥ 8.0.68，且已开通 Apple IAP |
| 开发者工具 | Nightly ≥ 2.02.2608312（虚拟支付调试） |
| 测试环境 | **必须真机**（虚拟支付不支持模拟器） |

## 配置步骤

1. **开通虚拟支付**：MP 后台 → 虚拟支付（个人主体需服务类目含「工具」）
2. **创建道具并记录**：`productId` 与价格（单位：分），发布后**等待几分钟到半小时**全平台同步
3. **部署云函数**：`integration/cloudbase-virtualpay/functions/xpay-common/`，配置环境变量（见该函数 README）
4. **修改本示例配置**：
   - `pages/pay/pay.js` → `PRODUCTS` 的 `id` / `price` 换成**你自己后台**的 `productId` 与价格（单位：分）。仓库里写的是作者联调用的 `goods_001~003`，不换会报 `PRODUCT_ID_NOT_PUBLISH`
   - `app.js` → `globalData.envId`（云开发环境 ID）
   - `app.js` → `globalData.functionName`（集成生成的函数名）
   - `pages/pay/pay.js` → `PRODUCTS`（换成你后台真实创建的道具）

## 链路说明

```
① wx.login()                     拿 code
② callHTTPFunction → /xpay/create_order
       服务端用 code 换 sessionKey
       → 构造 signData
       → paySig    = HMAC-SHA256("requestVirtualPayment&" + signData, AppKey)
       → signature = HMAC-SHA256(signData, sessionKey)
③ wx.requestVirtualPayment({ signData, mode, paySig, signature })
       客户端自行完成下单与收银台拉起（服务端不参与下单）
④ 支付成功 → 平台推送 xpay_goods_deliver_notify → 服务端幂等发货
⑤ 前端 success 回调不可靠，用 /xpay/query_order 查单兜底
```

## 调用方式

示例只走 `wx.cloud.callHTTPFunction` 一条链路：

| 维度 | 说明 |
|---|---|
| 鉴权 | 平台自动注入 `x-wx-openid`，可信，无需额外配置 |
| 前置条件 | `wx.cloud.init` + 云开发环境（基础库 ≥ 3.15.2） |
| 需要配置 | `app.js` 的 `envId`、`functionName` |

> 云函数若开放了公网直连（HTTP 访问服务 / 自定义域名），那条链路没有平台注入的身份头，
> 必须在**上游网关**（API 网关 / 云托管）自行加鉴权；函数内部不再内置鉴权开关，本示例不演示该链路。

## 与「微信支付」示例的关键差异

| 维度 | 普通支付 | 虚拟支付 |
|---|---|---|
| 客户端 API | `wx.requestPayment` | `wx.requestVirtualPayment` |
| 服务端角色 | 调统一下单拿 `prepay_id` | **只出签名，不下单** |
| 是否需要 code | 否（openid 平台注入） | **是**（换 sessionKey 算 signature） |
| iOS 支持 | 不支持虚拟商品 | 支持（底层走 Apple IAP） |
| 退款 | 前端可发起 | iOS 只能引导用户去 App Store |

## 常见错误

| 错误 | 原因 | 处理 |
|---|---|---|
| `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY` | 道具刚发布，平台同步延迟 | 等几分钟到半小时 |
| 道具 ID / 价格校验失败 | `goodsPrice` 与后台不一致 | 核对配置，**单位是分** |
| 当前商户尚未开启 iOS 支付 | IAP 未开通 | MP 后台配置小程序简称 + 开通 IAP |
| `callHTTPFunction is not a function` | 基础库过低 | 升到 ≥ 3.15.2 |

## ⚠️ 安全提醒

示例里 `productId` / `goodsPrice` 直接取自前端常量，**仅用于演示**。生产环境必须由后端根据 SKU 查询，否则攻击者可篡改价格。

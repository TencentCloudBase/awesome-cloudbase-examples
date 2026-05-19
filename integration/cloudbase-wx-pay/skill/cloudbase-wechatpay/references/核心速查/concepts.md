# 核心概念速查

> 支付接入中容易混淆或遗漏的概念。

---

## AppID 类型对应关系

| 支付方式 | AppID 类型 |
|---------|-----------|
| JSAPI/H5 | 公众号 AppID |
| 小程序 | 小程序 AppID |
| Native | 公众号或小程序 AppID |

## 有效期

| 对象 | 有效期 |
|------|--------|
| `prepay_id` | 2 小时 |
| `h5_url` | 5 分钟 |
| `code_url`（扫码） | ≈ 2 小时 |

## H5 支付必填项

- `scene_info.payer_client_ip` 必填（风控）
- `h5_info.type` 必填（如 `Wap`）
- 授权目录必须在商户平台配置，格式 `https://domain.com/`，末尾带 `/`

## 转账受理 ≠ 成功

受理成功（`ACCEPTED`）仅表示请求被接受，必须查单/等回调确认最终状态。

## 回调重试机制

15s×2 → 30s → 3min → 10min×... → 最长约 24h，共 ~15 次。**必须 5 秒内返回应答**。

## APIv3 密钥的双重角色

不仅用于请求签名，更是接收回调通知的前提条件！未设置 = 所有回调丢失。详见 `quick-start.md` Step 2。

## 签名探测请求（SIGNTEST）

微信会发送 `WECHATPAY/SIGNTEST/` 前缀的探测请求验证验签能力。收到后返回错误码即可，属正常行为。

## 回调 IP 白名单

需在防火墙/安全组放行微信回调 IP 段（上海/深圳/广州腾讯云）。

## SDK 模式双通道架构

小程序 Demo 走两条通道：
1. 前端 → `callHTTPFunction`/`callContainer`（主动请求，平台自动注入 openid）
2. 微信 → HTTP 访问服务（回调通知，无鉴权）

两者域名不同、鉴权方式不同，必须分别配置。详见 `quick-start.md` Step 4.0。

## 三种调用方式区别

1. **事件型（普通型）** `callFunction`：SDK 内部通道，自动带 openId，无公网地址，cloudbaserc.json 无 type 字段
2. **HTTP 云 API 网关**：需 Bearer Token，`?webfn=true`
3. **HTTP 访问服务**：公网域名，无内置鉴权，**唯一可收微信回调的方式**

> 小程序端推荐 ④ `wx.cloud.callHTTPFunction`（云函数）或 ⑤ `wx.cloud.callContainer`（云托管），平台自动注入 openid，无需 SDK 依赖。

## JSAPI 公众号后台配置

需配置 3 个域名：①网页授权域名（OAuth2）②JS接口安全域名 ③支付授权目录（商户平台）。三者缺一不可。

## 匿名登录不能用于支付

匿名登录没有 openid，无法完成任何支付操作。推荐使用 `callHTTPFunction` / `callContainer`。

## 模拟器 vs 真机测试

模拟器仅用于验证登录链路和下单接口；**真实支付必须在真机完成**（`wx.requestPayment` 需要输入支付密码）。使用微信开发者工具「真机调试」。

## 真机限额/风控

支付弹窗已调起但提示限额 = 技术链路已通，属微信风控。常见诱因：测试金额过小（建议 0.1-1 元）、单用户单日笔数超限、新商户号风控期、类目不匹配。详见 troubleshooting.md §3.6。

## Vite/SPA 部署 base 配置

使用 CloudBase 静态托管且 serviceName 非空时，`vite.config.js` 必须设置 `base: './'`，否则打包后 JS/CSS 引用为绝对路径导致 404。

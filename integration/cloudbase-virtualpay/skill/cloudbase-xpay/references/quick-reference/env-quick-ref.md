# 环境变量速查

| 变量（平台注入名） | 必填 | 默认 | 说明 |
|---|---|---|---|
| `offerId` | ✅ | — | 虚拟支付商户号 |
| `appKey` | ✅ | — | 支付签名密钥（旧名 `prodAppKey`） |
| `appId` | ✅ | — | 小程序 AppID |
| `secret` | ✅ | — | 换取 sessionKey 必需（旧名 `appSecret`） |
| `notifyFormat` | 否 | `json` | `json` / `xml`，须与微信后台一致；平台不注入，只能由 `cloudbaserc.json` 提供 |
| `notifyUrlCallbackType` | 否 | 空 | 未声明 = 自己验签；`system` = 网关代验签 |
| `trustBearerIdentity` | 否 | 空 | 采信 Bearer JWT 身份，仅当函数只经云 API 网关暴露时开 |
| `XPAY_GUARD` | 否 | 未设（= `on`） | **全模板唯一的联调开关**（与 wx-pay 的 `PAY_GUARD` 同一套心智）。`off` = 「本地查不到订单」时放行查单 + iOS 退款问询 `result_code=0`；`on` 或不设 = 全部拒绝/拦截。本地 `npm run dev` 已带 `off`；云上 + `off` 会拒绝启动，确需云上联调再加 `PAY_ALLOW_INSECURE_BOOT=true` |

> 🚨 `XPAY_GUARD` **不是集成中心注入的变量**：集成创建只产生 `appId / secret / offerId / appKey` 这类凭据，
> 不会创建它。它属于**函数自己的环境变量**，由 `cloudbaserc.json` 的 `functions[].envVariables` / `Dockerfile` 的 `ENV`
> 或控制台函数配置提供；缺省即 `on`，不影响正常部署。
>
> 变量名以**集成中心注入为准**（`authTypeCode=wxvirtualpay` → `appId / secret / offerId / appKey`），本地 `.env` 与旧文档的 `prodAppKey` / `appSecret` 由 `readEnv()` 回退兼容。
> 集成中心还注入 `token` / `msgSecret`（消息推送 Token 与 EncodingAESKey）。
> - 集成中心托管（网关代验签/代解密）：业务代码**不读取**。
> - 直连 HTTP 访问服务（无网关）：业务代码**必须自实现** URL 校验 + `msg_signature` 验签 + AES 解密（模板 `app.js` 已内置）。

# 常量速查

| 常量 | 值 |
|---|---|
| 道具直购 mode | `short_series_goods` |
| 代币充值 mode | `short_series_coin` |
| C 端 paySig 的 uri | `requestVirtualPayment` |
| 签名算法 | HMAC-SHA256（hex） |
| 币种 | `CNY` |
| 金额单位 | **分** |
| `outTradeNo` 长度 | 8–32 位，不能 `_` 开头 |
| `env`（固定常量，非环境变量） | `0`（现网，模板不支持切换） |
| 回调重推次数 | 最多 **15** 次 |
| iOS 退款问询时限 | **3 秒**（问 3 次） |
| EncodingAESKey 长度 | **43** 位 |
| 解密算法 | AES-256-CBC + PKCS#7 |

# 费率与结算

| 终端 | 费率 | 结算 | 谁能退款 |
|---|---|---|---|
| 安卓/鸿蒙/Windows | 1% | T+3 | 开发者 |
| iOS | 12% | 45–60 天 | 仅用户 |

- 180 天内退款退还手续费，超 180 天不退
- 个人主体：类目需含「工具」，全终端月限额 10 万元

# 应答格式

| 推送 | 应答 |
|---|---|
| JSON | `{"ErrCode":0,"ErrMsg":"success"}` |
| XML | `<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>` |
| 兜底 | 空串 或 `success` |

# 命名风格

| 场景 | 风格 | 示例 |
|---|---|---|
| C 端 signData | **驼峰** | `offerId` / `outTradeNo` / `goodsPrice` |
| B 端接口参数 | **下划线** | `offer_id` / `out_trade_no` |
| 回调推送字段 | **帕斯卡** | `OutTradeNo` / `Event` / `OpenId` |

# 签名基串

| 签名 | 基串 |
|---|---|
| C 端 `paySig` | `requestVirtualPayment&{signData}` |
| C 端 `signature` | `{signData}` |
| B 端 `paySig` | `{uri}&{postBody}` |
| B 端 `signature` | `{postBody}` |

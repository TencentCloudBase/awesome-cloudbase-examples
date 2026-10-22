# pay-common 微信支付通用模板

微信支付 V3 API 的 Express 通用模板，支持多种部署方式和回调处理模式。

## 特性

- **多平台支付**：JSAPI（小程序/微信内H5）、H5、Native 扫码、APP
- **多部署方式**：HTTP 云函数、云托管（Docker）、本地/自建服务器
- **双回调模式**：SDK 自验签解密 / 集成中心解密（环境变量一键切换，主动请求均走 SDK 自签名）
- **安全**：参数校验、回调验签、时间戳过期检查、幂等提示
- **回调规范**：先应答后处理、JSON 格式应答、签名探测兼容

---

## 快速开始

> 📖 **完整教程**：[skill/cloudbase-wechatpay/references/template-onboarding/quick-start.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/template-onboarding/quick-start.md)

### ⚠️ 铁律（必须遵守）

> **金额单位 = 分（cents）**：所有金额字段单位为**"分"**而非"元"。1 元 = `100`，9.99 元 = `999`。**禁止传入浮点数或元为单位。**

> **订单号全局唯一**：`out_trade_no` 和 `out_refund_no` 必须全局唯一。退款失败重试**必须复用原 `out_refund_no`**。

> **下单与调起使用同一私钥**：下单签名和调起支付签名**必须使用同一把商户 API 私钥**。

### Step 1：获取模板 & 安装依赖

```bash
cp -r pay-common your-project-name
cd your-project-name
npm install
```

### Step 2：配置环境变量

| 创建方式 | 环境变量写入位置 | 需要 `.env`？ |
|---------|----------------|:---:|
| **控制台集成中心创建** | 自动填写 + 自动部署 | ❌ |
| **CLI 部署到云函数** | `cloudbaserc.json` → `envVariables` | ❌ |
| **云托管** | 控制台 → 服务配置 → 环境变量 | ❌ |
| **本地开发** | `export` 或启动脚本注入 | 📄 `.env.example` 仅作参考 |

> 📖 **环境变量完整配置**：[env-config.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/template-onboarding/env-config.md)
>
> 📖 **SDK vs 网关模式**：[callback-mode.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/template-onboarding/callback-mode.md)
>
> 📖 **公钥验签 vs 证书验签**：[verify-mode.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/template-onboarding/verify-mode.md)

#### 环境变量完整配置

> ⚠️ **代码只读 `process.env`，没有 `dotenv`，不会自动加载 `.env` 文件！** `.env.example` 仅作参考模板。

**全量配置项清单**：

| 变量名 | 必填 | 示例值 | 说明 |
|--------|:----:|--------|------|
| `notifyURLCallbackType` | 集成中心自动注入 | `system` | 平台声明回调由谁验签。`system`=网关代验签，采信 `body.ParsedContent`；`ownservice`/空=本函数自己验签。**不要手工覆盖** |
| `appId` | 是 | `wx1234567890abcdef` | 小程序 / 公众号 AppID，需已在商户平台绑定 |
| `merchantId` | 是 | `1900009191` | 微信支付商户号（10 位数字） |
| `merchantSerialNumber` | 是 | `40位十六进制` | API 证书序列号 |
| `apiV3Key` | 是 | `32字节字符串` | APIv3 密钥，用于回调解密 |
| `privateKey` | 是 | PEM 字符串，换行用 `\n` | 商户 API 证书私钥（**最易出错项**，见下方格式说明） |
| `wxPayPublicKey` | 条件必填 | PEM 字符串，换行用 `\n` | 微信支付公钥。**配了此项 → 自动启用公钥验签；不配 → 走证书自动下载模式** |
| `wxPayPublicKeyId` | 条件必填 | `YOUR_WX_PAY_PUBLIC_KEY_ID` | 与 `wxPayPublicKey` 成对使用，配了公钥时必填 |
| `notifyURLPayURL` | 是 | `https://域名/路由Path/wx-pay/unifiedOrderTrigger` | 支付回调 URL（HTTPS，不能 localhost，不能带 `?`） |
| `notifyURLRefundsURL` | 是 | `https://域名/路由Path/wx-pay/refundTrigger` | 退款回调 URL |
| `transferNotifyUrl` | 是 | `https://域名/路由Path/wx-pay/transferTrigger` | 转账回调 URL |
| `corsAllowOrigin` | 否 | `https://your-domain.com` | CORS 允许域名，多个逗号分隔 |

> **回调 URL 组装公式**：`{HTTP访问服务域名}/{路由Path}/{API路径}`
>
> - **域名**：从 CloudBase 控制台 → 云函数 → HTTP 访问服务页面复制，形如 `your-env-id-your-uin.ap-shanghai.app.tcloudbase.com`
> - **路由Path**：你在"HTTP 访问服务"中为 `pay-common` 配置的访问路径（如 `/pay`）；如果直接挂在根路径则省略
> - **API路径**：固定为 `/wx-pay/unifiedOrderTrigger`、`/wx-pay/refundTrigger`、`/wx-pay/transferTrigger`
>
> 完整示例：`https://test-wxpay-xxx.ap-shanghai.app.tcloudbase.com/pay/wx-pay/unifiedOrderTrigger`
>
> ⚠️ **集成中心用户**：以上回调 URL 由平台自动生成注入，无需手动填写。

<details>
<summary>🔑 privateKey 格式详解（最容易踩坑）</summary>

```env
# 正确写法：整个 PEM 内容写在一行，换行用字面 \n（两个字符：反斜杠 + n）
privateKey=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADA...\n-----END PRIVATE KEY-----
```

代码 `config.js` 会执行 `.replace(/\\n/g, '\n')` 将字面 `\n` 还原为真换行。

| 错误写法 | 后果 |
|---------|------|
| 多行换行写入 | `.env` 解析截断 |
| 用 `\\n`（双重转义） | `\n` 变成字面文本 |
| 复制了多余空格 | PEM 解析失败 |

</details>

<details>
<summary>⚡ 最小可用配置（自建回调模式，复制即用）</summary>

```env
appId=YOUR_APP_ID
merchantId=YOUR_MERCHANT_ID
merchantSerialNumber=YOUR_SERIAL_NUMBER
apiV3Key=YOUR_API_V3_KEY
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_PUBLIC_KEY_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID
notifyURLPayURL=https://<YOUR_HTTP_DOMAIN>/wx-pay/unifiedOrderTrigger
notifyURLRefundsURL=https://<YOUR_HTTP_DOMAIN>/wx-pay/refundTrigger
transferNotifyUrl=https://<YOUR_HTTP_DOMAIN>/wx-pay/transferTrigger
```

CLI 部署时将这些值填入 `cloudbaserc.json` → `envVariables`；云托管在控制台填写。

</details>

<details>
<summary>⚠️ 公钥陷阱：微信支付公钥 vs 商户公钥</summary>

| 类型 | 用途 | 来源 |
|------|------|------|
| **微信支付公钥** (`wxPayPublicKey`) | ✅ 验签微信回调 | 商户平台 → API 安全 → 微信支付公钥 |
| 商户 API 公钥 | ❌ 不用于本模板 | 申请 API 证书时生成 |

**混淆后果**：用商户公钥验签 → 签名验证永远失败。

</details>

**回调处理模式速查**：

| 模式 | 主动请求 | 回调处理 | 适用场景 |
|------|---------|---------|---------|
| `sdk` | SDK 自签名 → 直连微信 | 自己验签解密 | 自部署（**必须开 HTTP 访问服务 + 关闭回调路由认证**） |
| `gateway` | SDK 自签名 → 直连微信 | 集成中心已解密 | 控制台集成中心创建（主流） |

#### 回调安全（必读）

采信 `body.ParsedContent` 免验签需要**两个条件同时成立**，缺一个都退回自验签（fail closed）：

| 判定依据 | 含义 | 代码强制不了的边界 |
|---|---|---|
| 平台注入 `notifyURLCallbackType=system` | 这个实例的回调托管在集成中心，网关已代验签解密 | 它证明的是「实例配置」，不是「本次请求来源」：函数一旦开了公网入口，任何人都能 POST `{"ParsedContent":{...}}` |

| 实际配置 | 回调行为 |
|---|---|
| `notifyURLCallbackType=system`（集成中心创建即如此） | 采信 `ParsedContent` + 结构校验 + **必须带 `wechatpay-timestamp` 且不超过 5 分钟**；**函数不得开公网入口** |
| `ownservice` / 空（未声明） | 自验签 + 解密（自建公网回调） |

> 🚨 回调路由本身没有鉴权：`system` 时只要请求体里有 `ParsedContent` 就采信，等于开放了一个免签名的「支付成功」入口。所以 `system` 模式**必须不开公网入口**。
>
> 集成中心（官方推荐）部署时：平台会自动注入 `notifyURLCallbackType=system` 和三个回调地址，**不要手工覆盖**；同时**不要为 `pay-common` 开 HTTP 访问服务** —— 这条是部署约束，代码强制不了（函数无法自查是否开放了公网入口）。
> 自建公网回调（备选）时：保持不填（= 未声明，走自验签），同时按微信要求配置 `token` / `msgSecret` / 平台证书或支付公钥。

#### 金额校验（上线前必须实现）

普通微信支付按**请求金额**收款，微信不核对商品值多少钱：请求体写 `amount: { total: 1 }` 就是一笔 1 分钱订单，付完回调照样 `SUCCESS`。

模板会调用两个业务钩子（`services/orderService.js`），**默认拒绝交易（fail closed）**——返回 `{ ok: false }`，不是返回 `null` 静默放行：

| 钩子 | 调用时机 | 默认行为 | 实现要点 |
|---|---|---|---|
| `verifyAmount(params)` | 下单前（调微信**之前**） | `{ ok: false }` 拒绝 | 按 `product_id` 查真实价格，与 `amount.total` 比对，一致时返回 `{ ok: true }` |
| `verifyRefundAmount(params)` | 退款前（调微信**之前**） | `{ ok: false }` 拒绝 | 以落库订单金额 / 已退金额为上限，通过时返回 `{ ok: true }`。`validator.js` 只保证 `refund <= total`，而两个数都来自请求体 |

调用方（`payService`）**只认 `{ ok: true }`**：钩子返回 `null` / `{ ok: false }` 一律抛错中断。
早期版本把 `null` 当成「不校验」放行 —— 那等于把收款金额 / 退款金额的决定权完全交给客户端，对每一笔交易 100% 生效。

中断发生在调用微信**之前**，不会出现「微信侧已下单、本地金额错」的不一致状态。

> 本地联调（还没有商品表 / 订单表）用 `PAY_GUARD=off` 一次性放行，见下方。

##### 联调开关：`PAY_GUARD`（全模板只有这一个变量）

模板默认拒绝交易（fail closed），所以**刚拉下来不改代码，下单 400、查单/退款 403** —— 这是预期行为，不是配置错了。
`PAY_GUARD` 只有两个取值，决定 `orderService` 的 4 个业务钩子是否启用：

| 钩子 | `on` / 不设（默认） | `off` |
|---|---|---|
| `verifyAmount` | 下单 400「服务端未核定订单金额」 | 放行 |
| `verifyRefundAmount` | 退款 400「服务端未核定可退金额」 | 放行 |
| `verifyOrderOwner` | 查单 / 关单 / 退款 / 查退款 403 | 放行 |
| `verifyTransferAllowed` | 转账 / 查转账单 403 | 放行 |

**联调 / 部署就靠这一个值切换：**

| 场景 | 怎么跑 | `PAY_GUARD` | 钩子 |
|---|---|---|---|
| 本地联调 | `npm run dev`（脚本已带 `PAY_GUARD=off`，**不需要**别的变量） | `off` | 跳过 |
| 云上联调 | 控制台环境变量加 `PAY_GUARD=off` **和** `PAY_ALLOW_INSECURE_BOOT=true` | `off` | 跳过 |
| 正式部署（CLI） | `cloudbaserc.json` 已预置 `"PAY_GUARD": "on"` | `on` | 全部拒绝 |
| 正式部署（云托管） | `Dockerfile` 已预置 `ENV PAY_GUARD=on` | `on` | 全部拒绝 |
| 漏配 | 什么都不设 | 未设（= `on`） | 全部拒绝（安全默认） |

> 失败是**安全侧**的：只有显式写 `off` 才放开，写 `dev`、`false`、`0` 这类值都不等于 `off`，
> 一律按开启处理，会继续 400 / 403。
>
> ⚠️ 代码只读 `process.env`，**没有 dotenv**，`.env` 文件不会自动加载；本地用 `npm run dev` 即可。
>
> 🚨 `PAY_GUARD=off` 属于**危险开关**：启动时会用 `console.error` 打横幅；
> 若同时**跑在云上**（云函数 / 云托管），默认 `process.exit(1)` **拒绝启动** ——
> 云上出现 `off` 通常意味着「联调配置被当成正式配置发布了」，而容器日志里的横幅极易被淹没。
> 这种组合确需联调时，额外设 `PAY_ALLOW_INSECURE_BOOT=true` 显式放行。
> 本地开发不在此列：`npm run dev` 直接可跑，不用配第二个变量。

**上线前必须做的两件事：**

1. 确认 `PAY_GUARD=on`（`cloudbaserc.json` / `Dockerfile` 已预置；最稳的是不设这个变量）
   —— 只要不是 `off`，4 个钩子就一定是拒绝状态
2. 在 `verifyAmount` / `verifyRefundAmount` / `verifyOrderOwner` / `verifyTransferAllowed` 里接数据库，
   核定通过时返回 `{ ok: true }`
   （参考 `services/orderService.js` 里的示例实现，或 `skill/cloudbase-wechatpay/references/business-logic/order-service.md`）

#### 归属校验（查单 / 关单 / 退款 / 转账）

鉴权中间件只回答「你是谁」，**不回答「这单是不是你的」**。以下接口在调微信之前要求归属钩子放行，
默认一律返回 `403`（`orderService` 没有订单表，答不了归属问题）：

| 接口 | 缺归属校验的后果 | 钩子 |
|---|---|---|
| `/wxpay_query_order_by_out_trade_no`、`/wxpay_query_order_by_transaction_id` | 拿别人的单号越权查单，批量遍历可探测订单是否存在与状态 | `verifyOrderOwner` |
| `/wxpay_close_order` | 关掉别人还没支付的订单 | `verifyOrderOwner` |
| `/wxpay_refund`、`/wxpay_refund_query` | 对别人的订单发起退款 / 查退款进度 | `verifyOrderOwner` |
| `/wxpay_transfer` | 收款 `openid` 与 `transfer_amount` 都由请求体决定 → 把商户余额转给任意人 | `verifyTransferAllowed` |

两个钩子都**只认 `{ ok: true }`**：返回 `null` / `{ ok: false }` 一律 403，且不会调用微信。

> 联调时同样用上面那**一个** `PAY_GUARD=off`，不额外区分金额与归属。
> ⚠️ 生产设成 `off` = 任何登录用户都能操作别人的订单、把商户余额转给任意 openid。

同时 `appid` / `mchid` / `notify_url` **一律由服务端赋值**，请求体里传了会被忽略（否则客户端能换掉商户号或把回调结果导流到自己的服务器）。

### Step 3：部署

| 方式 | 命令 | 详细文档 |
|------|------|---------|
| **HTTP 云函数** | `tcb fn deploy pay-common` | [deploy-cloud-function.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/deployment/deploy-cloud-function.md) |
| **云托管** | `tcb cloudrun deploy pay-common --path .` | [deploy-cloud-run.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/deployment/deploy-cloud-run.md) |
| **本地开发** | `npm start` → `http://localhost:3000` | [deploy-local.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/deployment/deploy-local.md) |

> ⚠️ `cloudbaserc.json` 中 `"type": "HTTP"` 必须声明，否则无法通过 HTTP 访问服务访问。

### Step 4：接入前端

| 场景 | 调用方式 | 详细文档 |
|------|---------|---------|
| **小程序** | `callHTTPFunction`（推荐） | [miniprogram-cloud-api.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/miniprogram-cloud-api.md) |
| **小程序（云托管）** | `callContainer` | [miniprogram-cloud-run.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/miniprogram-cloud-run.md) |
| **H5（微信外浏览器）** | `fetch` → `h5_url` 跳转 | [web-h5.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/web-h5.md) |
| **JSAPI（微信内浏览器）** | `WeixinJSBridge.invoke` | [web-h5.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/web-h5.md) |
| **Native 扫码** | `fetch` → 生成二维码 | [web-native.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/web-native.md) |
| **微搭低码** | `callHTTPFunction` | [weda-miniprogram.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/weda-miniprogram.md) |

> APP 支付（原生 iOS/Android App）**不在本模板范围内**：它需要微信开放平台的「移动应用」AppID（与小程序/公众号 AppID 不同）、`transactions_app` 接口与 `Sign=WXPay` 专用签名字段，还要客户端原生集成微信 SDK。本模板只覆盖小程序 / 公众号 JSAPI、H5、Native 扫码。

> 完整可运行示例：[`examples/miniprogram/`](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/examples/miniprogram/)（云函数版）、[`examples/miniprogram-cloudrun/`](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/examples/miniprogram-cloudrun/)（云托管版）

#### 小程序 `callHTTPFunction` 下单支付流程

> 推荐方式：通过 `wx.cloud.callHTTPFunction` 调用 HTTP 云函数，**平台自动注入 openid，无需登录流程**。

**调用链路**：

```
用户点击"支付"
  ↓
1. wx.cloud.callHTTPFunction({ name, path, data })
  ↓
2. 平台自动注入 x-wx-openid header（客户端无法伪造）
  ↓
3. HTTP 云函数收到请求 → 从 header 获取 openid → 签名下单
  ↓
4. 返回 prepay_id + 签名参数
  ↓
5. wx.requestPayment({ timeStamp, nonceStr, package, signType, paySign })
  ↓
6. 用户在微信界面完成支付
```

**Step A：app.js 初始化**

```js
// app.js
const ENV_ID = 'YOUR_ENV_ID'           // ⚠️ 替换为你的云开发环境 ID
const FUNCTION_NAME = 'pay-common'     // HTTP 云函数名称（集成中心创建的以实际名称为准）

App({
  globalData: { envId: ENV_ID, functionName: FUNCTION_NAME },
  onLaunch() {
    wx.cloud.init({ env: ENV_ID, traceUser: true })
  },
})
```

**Step B：封装通用调用方法**

```js
// pages/pay/pay.js 顶部
const app = getApp()

function callPayCommon(action, data) {
  const { functionName, envId } = app.globalData
  return new Promise((resolve, reject) => {
    wx.cloud.callHTTPFunction({
      name: functionName,
      config: { env: envId },
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      path: `/wx-pay/${action}`,      // 直接映射 Express 路由
      data,
      success(res) {
        res.statusCode < 300 ? resolve(res.data) : reject({ code: -1, msg: `HTTP ${res.statusCode}` })
      },
      fail: reject,
    })
  })
}
```

**Step C：下单 + 调起支付**

```js
async handlePay() {
  // 1️⃣ 下单（openid 由平台自动注入，无需传入）
  const res = await callPayCommon('wxpay_order', {
    description: '商品名称',
    out_trade_no: 'ORDER' + Date.now(),                   // 全局唯一 ⚠️
    amount: { total: 100, currency: 'CNY' },              // 单位=分 ⚠️
    // ❌ 不需要传 payer.openid，后端自动从 x-wx-openid 获取
  })
  if (res.code !== 0) return wx.showToast({ title: res.msg, icon: 'none' })

  // 2️⃣ 调起微信支付
  const payData = res.data?.data || res.data
  await wx.requestPayment({
    timeStamp: String(payData.timeStamp),
    nonceStr:  payData.nonceStr,
    package:   payData.package || ('prepay_id=' + payData.prepay_id),
    signType:  'RSA',
    paySign:   payData.paySign,
  })
  wx.showToast({ title: '支付成功', icon: 'success' })
  // ⚠️ 建议支付成功后主动查单确认，不要仅依赖前端回调
}
```

**前置条件**：

| 条件 | 说明 |
|------|------|
| `wx.cloud.init()` 已调用 | 必须在 `callHTTPFunction` 前执行 |
| 基础库 ≥ 3.15.2 | `project.config.json` 中 `libVersion` 设为 `3.15.2`+ |
| 无需 npm 依赖 | 不需要 `npm install`、不需要构建 npm |
| 无需登录 / Token | 平台自动鉴权 + 注入 openid |

**常见问题**：

| 问题 | 原因 | 解决 |
|------|------|------|
| `callHTTPFunction is not a function` | 基础库版本过低 | `libVersion` ≥ `3.15.2` |
| openid 为空 | 开发工具未设置 / 未真机调试 | 使用真机调试 |
| `requestPayment` 签名错误 | 下单与调起用了不同私钥 | 确保同一套凭证 |
| 调用返回 404 | 函数名或路径错误 | 检查 `name`（集成中心创建的实际名称）和 `path` |
| 下单返回 `-1` | 金额非整数等参数错误 | 检查 `amount.total` 是否为正整数（分） |

> 📖 **完整文档**：[miniprogram-cloud-api.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/frontend-integration/miniprogram-cloud-api.md)

### Step 5：接入业务逻辑

编辑 `services/orderService.js`，接入你的数据库。

> 📖 **数据库集成方案**：[order-service.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/business-logic/order-service.md)
>
> 📖 **安全红线 + 上线清单**：[security-checklist.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/business-logic/security-checklist.md)

#### 自定义 orderService

`services/orderService.js` 是**业务钩子层**——所有方法当前都是空壳（仅打印日志 + `return true`）。上线前**必须**替换为你自己的数据库操作。

**调用链路**：

```
前端请求 → routes/pay.js → controllers/payController.js → services/payService.js → services/orderService.js
                                                                                          ↑ 你只需改这里
```

**6 个方法一览**：

| 方法 | 触发时机 | 你要做什么 | 幂等要求 |
|------|---------|-----------|:--------:|
| `handlerUnified(params, identity)` | 下单成功后 | 创建订单记录到数据库（归属取 `identity.openid`，无 openid 用 `identity.uid`） | — |
| `handlerUnifiedTrigger(params)` | 支付回调通知 | 更新订单为"已支付"、发货等 | **必须** |
| `handlerRefund(params)` | 退款申请成功后 | 更新订单为"退款中" | — |
| `handlerRefundTrigger(params)` | 退款回调通知 | 更新退款最终结果 | **必须** |
| `handlerTransfer(params, result)` | 转账受理成功后 | 记录转账单 | — |
| `handlerTransferTrigger(params)` | 转账回调通知 | 更新转账最终状态 | **必须** |

**示例：以 CloudBase 数据库实现 `handlerUnifiedTrigger`**（最关键的支付回调处理）：

```js
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: process.env.ENV_ID });
const db = app.database();
const _ = db.command;

async handlerUnifiedTrigger(params) {
    const { out_trade_no, transaction_id, trade_state, amount } = params;

    // 1. 幂等检查：查询当前订单状态
    const { data } = await db.collection('orders')
        .where({ out_trade_no })
        .get();

    if (!data.length) {
        console.error('[OrderService] 订单不存在:', out_trade_no);
        return false;
    }

    const order = data[0];

    // 已处理过 → 直接跳过（幂等）
    if (order.status === 'paid') {
        console.info('[OrderService] 重复回调，已跳过:', out_trade_no);
        return true;
    }

    // 2. 金额校验（防篡改）
    if (amount.total !== order.amount) {
        console.error('[OrderService] 金额不匹配:', amount.total, '!=', order.amount);
        return false;
    }

    // 3. 更新订单状态
    if (trade_state === 'SUCCESS') {
        await db.collection('orders').doc(order._id).update({
            status: 'paid',
            transaction_id,
            paid_at: new Date(),
        });
        // 4. 执行后续业务（发货、通知等）
        // await this.sendGoods(order);
    }

    return true;
}
```

> ⚠️ **回调幂等三件事**：① 查状态（已处理就跳过）→ ② 校金额（防篡改）→ ③ 再更新

**每个方法接收的参数**：

<details>
<summary>handlerUnified(params, identity) — 下单参数 + 登录身份</summary>

```js
// params：下单参数
{
    out_trade_no: 'ORDER202604130001',  // 商户订单号
    description: '测试商品',              // 商品描述
    amount: { total: 100, currency: 'CNY' }, // 金额（分）
    payer: { openid: 'oUpF8...' }        // 支付者（JSAPI 必传）
}

// identity：登录身份（来自鉴权中间件，controller 单独传入，不在 params 里）
{ openid: 'oUpF8...', uid: 'uid_xxx' }   // H5 微信外登录时 openid 可能为 null，只剩 uid
```

> ⚠️ 归属标识由 `orderService.resolveOwner(params, identity)` 统一解析：
> **只认登录身份** `identity.openid` → `identity.uid`，每个候选都要过格式校验。
> `params.payer.openid`（请求体字段）**已不再作为归属候选** —— 客户端可填别人的 openid。
> **identity 取不到合法值时下单直接失败**（抛「订单缺少归属身份」），不会创建无主订单 ——
> 无归属订单会让后续查单 / 退款的归属校验退化成 `{ owner: null }`，存在越权风险。
</details>

<details>
<summary>handlerUnifiedTrigger(params) — 支付回调明文</summary>

```js
{
    out_trade_no: 'ORDER202604130001',
    transaction_id: '4200001985...',     // 微信支付订单号
    trade_state: 'SUCCESS',              // SUCCESS/REFUND/NOTPAY/CLOSED
    trade_type: 'JSAPI',                 // JSAPI/NATIVE/APP/MWEB
    amount: { total: 100, payer_total: 100, currency: 'CNY' },
    payer: { openid: 'oUpF8...' }
}
```
</details>

<details>
<summary>handlerRefund(params) — 退款请求参数</summary>

```js
{
    out_trade_no: 'ORDER202604130001',
    out_refund_no: 'REFUND202604130001', // 商户退款单号
    amount: { total: 100, refund: 50 }    // 原单总额 + 退款金额（分）
}
```
</details>

<details>
<summary>handlerRefundTrigger(params) — 退款回调明文</summary>

```js
{
    out_trade_no: 'ORDER202604130001',
    out_refund_no: 'REFUND202604130001',
    transaction_id: '4200001985...',
    refund_id: '50000001982...',          // 微信退款单号
    refund_status: 'SUCCESS',             // SUCCESS/CHANGE/REFUNDCLOSE
    amount: { total: 100, refund: 50, payer_total: 100, payer_refund: 50 }
}
```
</details>

<details>
<summary>handlerTransfer(params, result) — 转账请求 + 微信返回</summary>

```js
// params（你的请求参数）
{
    out_bill_no: 'TRANS202604130001',    // 商户转账单号
    transfer_amount: 100,                 // 转账金额（分）
    openid: 'oUpF8...'                    // 收款用户 openid
}
// result（微信返回）
{
    transfer_bill_no: '1300001201...',   // 微信转账单号
    out_bill_no: 'TRANS202604130001',
    create_time: '2024-04-13T10:00:00+08:00',
    state: 'ACCEPTED'
}
```
</details>

<details>
<summary>handlerTransferTrigger(params) — 转账回调明文</summary>

```js
{
    mchid: '1900009191',                 // 商户号
    out_bill_no: 'TRANS202604130001',
    transfer_bill_no: '1300001201...',
    state: 'SUCCESS'                      // SUCCESS/FAIL
}
```
</details>

---

## 路由表

所有路由前缀：`/wx-pay`

### 下单

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_order` | POST | JSAPI/小程序下单 | payMiddleware |
| `/wxpay_order_h5` | POST | H5 下单 | h5SecurityMiddleware（Origin/Referer 白名单 + 登录态） |
| `/wxpay_order_native` | POST | Native 扫码下单 | payMiddleware |

### 查询

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_query_order_by_out_trade_no` | POST | 商户订单号查单 | payMiddleware + 归属钩子 |
| `/wxpay_query_order_by_transaction_id` | POST | 微信订单号查单 | payMiddleware + 归属钩子 |
| `/wxpay_close_order` | POST | 关闭订单 | payMiddleware + 归属钩子 |

> 归属钩子 = `orderService.verifyOrderOwner`，默认 `{ ok: false }` → 403（见「归属校验」小节）

### 退款

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_refund` | POST | 申请退款 | payMiddleware + 归属钩子 + 金额钩子 |
| `/wxpay_refund_query` | POST | 查询退款 | payMiddleware + 归属钩子 |

### 商家转账

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_transfer` | POST | 发起商家转账 | payMiddleware + 转账权限钩子 |
| `/wxpay_transfer_bill_query` | POST | 商户单号查询 | payMiddleware + 转账权限钩子 |
| `/wxpay_transfer_bill_query_by_no` | POST | 微信单号查询 | payMiddleware |

> 📖 **商家转账详解**：[transfer.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/business-logic/transfer.md)

### 回调（无鉴权，微信支付服务器直接调用）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/unifiedOrderTrigger` | POST | 支付回调通知 |
| `/refundTrigger` | POST | 退款回调通知 |
| `/transferTrigger` | POST | 商家转账回调通知 |

### 鉴权模型

业务路由（上表中标注中间件的）只认两个身份来源，其余一律 401：

| 来源 | 谁注入 | 前提 |
|---|---|---|
| `x-wx-openid` | `wx.cloud.callHTTPFunction` / `callContainer` 的平台网关 | 请求确实经过平台网关 |
| `Authorization: Bearer <JWT>` | 云 API 网关（已验签） | 网关验签后才转发，函数内只解码 + 校验 payload |

> 🚨 以下来源**不能**作为鉴权依据，代码里已全部删除：
> - `x-tcb-integration-id` 等自定义 header：客户端可任意添加
> - `x-wx-source` / `x-authmethod`：同样是可伪造的普通 header（虽然平台会注入，但直连时客户端也能塞）
> - `TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`：云函数内**恒存在**，放行等于中间件无条件通过
> - `body.payer.openid`：请求体字段，客户端可填别人的 openid（**连同 `ALLOW_BODY_OPENID` 开关已整层删除**）

**Bearer 分支的边界**：函数内不验签（没有公钥），只校验 payload 内容——必须含 `sub` / `provider_sub`、`exp` 未过期、`iss` 符合预期（配了 `AUTH_EXPECTED_ISSUER` 才校验）。所以：

1. 只有 `sub`（CloudBase UID）、没有 `provider_sub`（微信 openid）的 token 仍可鉴权通过，身份按 UID 记（与 H5 口径一致）；但 **JSAPI 下单（`/wxpay_order`）必须有 openid**，这条路由由 `requireWechatOpenId` 拦截并回 **403**（`凭证缺 provider_sub`），**不会**混成 401 匿名。
2. **必须确认前置网关强制验签，且禁止公网直连函数端口。** Dockerfile 暴露的 80 端口只允许网关 / 容器内网访问；公网直连时任何人都能伪造 Bearer 与 `x-wx-openid`。

**放行契约**（两个中间件口径一致，不存在「放行但取不到身份」）：

| 中间件 | 放行条件 | 放行后取身份 |
|---|---|---|
| `payMiddleware` | openid 或 UID 任一非空 | 有 openid 用 `getOpenId(req)`，只有 UID 用 `getUid(req)` |
| `requireWechatOpenId`（仅 `/wxpay_order`） | 必须有 openid | 缺失回 403，`msg` 指明缺 `provider_sub` |
| `h5SecurityMiddleware` | openid 或 UID 任一非空 | 有 openid 用 `getOpenId(req)`，只有 UID 用 `getUid(req)` |

两条路由的放行口径现在一致：H5（MWEB）常在微信外浏览器发起，CloudBase Auth 凭证只有 `sub`、没有 `provider_sub`，这类身份在两条路由上都能通过，订单归属按 UID 记录，控制器不依赖 openid 落库。唯一例外是 JSAPI 下单 —— 它必须知道付款人的微信身份，所以在路由层多挂一个 `requireWechatOpenId`。

三个下单入口（JSAPI / H5 / Native）都会把 `{ openid, uid }` 作为 `identity` 透传给 `payService.unifiedOrder` → `orderService.handlerUnified`，归属口径完全一致；`identity` 不会塞进 `req.body`（body 会原样发给微信支付 API）。

### H5 路由（`/wxpay_order_h5`）

H5 拿不到平台注入的 `x-wx-openid`，只靠 Origin 白名单是不够的——浏览器同源 POST 可能不带 `Origin`，跨站请求也拿不到本站 token。因此该路由三件事缺一不可：

| 检查 | 不通过的结果 | 说明 |
|---|---|---|
| `corsAllowOrigin` 已配置 | 403 | 没配白名单 = 不知道该信谁，不静默放行 |
| `Origin` / `Referer` 在白名单内 | 403 | 两者都没有 → 拒绝（Referer 只作 Origin 缺失时的兜底） |
| 登录态（Bearer / `x-wx-openid`） | 401 | 跨站伪造请求拿不到 token，即 CSRF 防护；微信外浏览器登录只有 UID（无 openid）也算已登录，订单归属按 UID 记 |

相关环境变量（**默认都是关闭/拒绝**，只在明确知道后果时开启）：

| 变量 | 默认 | 作用 |
|---|---|---|
| `corsAllowOrigin` | 空 | H5 来源白名单，逗号分隔；为空则 H5 路由直接 403 |
| `ALLOW_ANONYMOUS_H5` | 关 | `true` 时允许未登录调用 H5 下单（仅本地联调） |
| `PAY_GUARD` | 未设（= `on`） | **全模板唯一的联调开关**。`off` = 跳过金额核定 + 订单归属 / 转账权限校验（4 个钩子）；其余任何值（含不设）= 全部生效拒绝。`cloudbaserc.json` / `Dockerfile` 已预置 `on` |
| `PAY_ALLOW_INSECURE_BOOT` | 关 | 仅用于「云上 + `PAY_GUARD=off`」的组合：默认 `process.exit(1)` 拒绝启动，设 `true` 才放行。本地 `npm run dev` 不需要 |
| `AUTH_EXPECTED_ISSUER` | 空 | 配了就强校验 JWT 的 `iss` |

> 🚨 曾经还有 `ALLOW_BODY_OPENID`（开启后可从 `body.payer.openid` 取身份），**已整层删除**。
> 身份只从两个服务端可验证来源取，按路由区分：
> **小程序路由**（`/wxpay_order`、`/wxpay_order_native`、退款、转账）= 平台注入的 `x-wx-openid`；
> **Web / App 路由**（`/wxpay_order_h5`）= 网关验过的 `Authorization: Bearer <JWT>`。
> `orderService.resolveOwner` 也只认登录身份，不再把 `params.payer.openid` 当归属候选。

实现见 `middleware/auth.js` / `utils/cloudbaseAuth.js`，回归测试见 `tests/auth.test.js`。

---

## API 文档（入参/出参）

### 1. 下单

#### 1.1 JSAPI/小程序下单

`POST /wx-pay/wxpay_order`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `description` | string | ✅ | 商品描述，最长 127 字符 |
| `out_trade_no` | string | ✅ | 商户订单号，6-32 位，仅含字母/数字/下划线/连字符。**必须由调用方生成并传入**，微信要求全局唯一 |
| `amount` | object | ✅ | 订单金额 |
| `amount.total` | number | ✅ | 订单总金额（单位：**分**），必须是正整数 |
| `amount.currency` | string | ❌ | 货币类型，默认 `CNY` |
| `payer` | object | ❌ | 支付者信息（JSAPI 必填 `openid`） |
| `payer.openid` | string | ❌ | 用户 OpenID。**推荐不传**，后端自动从 `x-wx-openid` header 注入 |
| `notify_url` | string | ❌ | 支付回调 URL，默认使用环境变量 `notifyURLPayURL` |
| `appid` | string | ❌ | 覆盖默认 appId（用于多公众号场景） |
| `useServiceAccount` | boolean | ❌ | `true` 时使用 `service_app_id` 环境变量（服务号 appId） |

**出参**（成功）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": 200,
    "data": {
      "appId": "wx1234567890abcdef",
      "prepay_id": "wx201410532645360000000000",
      "timeStamp": "1720000000",
      "nonceStr": "abc123...",
      "package": "prepay_id=wx201410532645360000000000",
      "signType": "RSA",
      "paySign": "base64签名串..."
    }
  }
}
```

> 📌 前端调起支付时使用 `res.data?.data || res.data` 获取支付参数。

---

#### 1.2 H5 下单

`POST /wx-pay/wxpay_order_h5`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `description` | string | ✅ | 商品描述 |
| `out_trade_no` | string | ❌ | 商户订单号 |
| `amount` | object | ✅ | 订单金额 |
| `amount.total` | number | ✅ | 订单总金额（单位：**分**） |
| `amount.currency` | string | ❌ | 默认 `CNY` |
| `scene_info` | object | ✅ | H5 场景信息 |
| `scene_info.payer_client_ip` | string | ✅ | 用户客户端 IP |
| `scene_info.h5_info` | object | ✅ | H5 信息，`{ type: 'Wap', wap_url: 'https://...', wap_name: '网页名称' }` |
| `notify_url` | string | ❌ | 支付回调 URL |

> ⚠️ H5 支付本身不需要 `payer.openid`。若请求里带了 `payer.openid`，**必须与登录身份一致**，
> 没有登录身份时该字段会被后端直接丢弃 —— 不允许客户端自己指定「我是谁」。
> 调用方需带 `Authorization: Bearer <CloudBase Auth token>`，并在服务端配置 `corsAllowOrigin`。

**出参**（成功）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": 200,
    "data": {
      "h5_url": "https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb?..."
    }
  }
}
```

> 📌 前端拿到 `h5_url` 后跳转，微信会自动拉起支付。

---

#### 1.3 Native 扫码下单

`POST /wx-pay/wxpay_order_native`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `description` | string | ✅ | 商品描述 |
| `out_trade_no` | string | ❌ | 商户订单号 |
| `amount` | object | ✅ | 订单金额 |
| `amount.total` | number | ✅ | 订单总金额（单位：**分**） |
| `amount.currency` | string | ❌ | 默认 `CNY` |
| `notify_url` | string | ❌ | 支付回调 URL |

**出参**（成功）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": 200,
    "data": {
      "code_url": "weixin://wxpay/bizpayurl?pr=..."
    }
  }
}
```

> 📌 前端用 `code_url` 生成二维码，用户扫码支付。

---

### 2. 查询

> ⚠️ 查单 / 关单 / 退款 / 查退款 / 转账都会先过**归属钩子**（`verifyOrderOwner` / `verifyTransferAllowed`），
> 默认返回 `403`。联调时设 `PAY_GUARD=off`，上线前实现钩子。见「归属校验」小节。

#### 2.1 商户订单号查单

`POST /wx-pay/wxpay_query_order_by_out_trade_no`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_trade_no` | string | ✅ | 商户订单号 |

**出参**：微信支付查单接口原始返回，详见[微信文档](https://pay.weixin.qq.com/doc/v3/merchant/4012791898)。

---

#### 2.2 微信订单号查单

`POST /wx-pay/wxpay_query_order_by_transaction_id`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `transaction_id` | string | ✅ | 微信支付订单号 |

**出参**：同 2.1。

---

#### 2.3 关闭订单

`POST /wx-pay/wxpay_close_order`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_trade_no` | string | ✅ | 商户订单号 |

**出参**（成功）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": 204
  }
}
```

> 📌 微信返回 HTTP 204 表示关闭成功，无响应体。

---

### 3. 退款

#### 3.1 申请退款

`POST /wx-pay/wxpay_refund`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_trade_no` | string | ❌① | 商户订单号（与 `transaction_id` 二选一） |
| `transaction_id` | string | ❌① | 微信订单号（与 `out_trade_no` 二选一） |
| `out_refund_no` | string | ✅ | 商户退款单号，**必须全局唯一** |
| `reason` | string | ❌ | 退款原因，会展示在用户账单中 |
| `amount` | object | ✅ | 金额信息 |
| `amount.total` | number | ✅ | 原订单总金额（单位：**分**） |
| `amount.refund` | number | ✅ | 退款金额（单位：**分**），不能超过 `total` |
| `amount.currency` | string | ❌ | 货币类型，默认 `CNY` |
| `notify_url` | string | ❌ | 退款回调 URL，默认使用环境变量 `notifyURLRefundsURL` |

> ① `out_trade_no` 和 `transaction_id` 至少填一个。

**出参**（成功）：微信支付退款接口原始返回，包含 `refund_id`（微信退款单号）。

---

#### 3.2 查询退款

`POST /wx-pay/wxpay_refund_query`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_refund_no` | string | ✅ | 商户退款单号 |

**出参**：微信支付退款查询接口原始返回。

---

### 4. 商家转账

#### 4.1 发起转账

`POST /wx-pay/wxpay_transfer`

> ⚠️ 本模板仅支持**免密小额转账（0.3 - 2000 元）**，不支持 `user_name`（需加密）。

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_bill_no` | string | ✅ | 商户转账单号，仅含字母/数字，最长 32 位 |
| `transfer_scene_id` | string | ✅ | 转账场景 ID，如 `1000`（现金营销） |
| `openid` | string | ✅ | 收款用户 OpenID。**推荐不传**，后端自动注入 |
| `transfer_amount` | number | ✅ | 转账金额（单位：**分**），范围：30 - 200000 |
| `transfer_remark` | string | ✅ | 转账备注，最长 32 字符 |
| `transfer_scene_report_infos` | array | ✅ | 转账场景报备信息，格式：`[{ name: '活动名称', value: '...' }]` |
| `notify_url` | string | ❌ | 转账回调 URL，默认使用环境变量 `transferNotifyUrl` |
| `appid` | string | ❌ | 覆盖默认 appId |
| `useServiceAccount` | boolean | ❌ | 使用服务号 appId |

**出参**（受理成功）：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": 200,
    "data": {
      "transfer_bill_no": "130000019820241013e0b8c6axxxxx",
      "out_bill_no": "TRANS202604130001",
      "create_time": "2024-04-13T10:00:00+08:00",
      "state": "ACCEPTED",
      "mchId": "1900009191"
    }
  }
}
```

> ⚠️ `state=ACCEPTED` 表示**受理成功**，不等于转账成功。必须通过查单或回调确认最终状态。

---

#### 4.2 商户单号查询转账单

`POST /wx-pay/wxpay_transfer_bill_query`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `out_bill_no` | string | ✅ | 商户转账单号 |

**出参**：微信支付转账单查询接口原始返回。

---

#### 4.3 微信单号查询转账单

`POST /wx-pay/wxpay_transfer_bill_query_by_no`

**入参**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `transfer_bill_no` | string | ✅ | 微信转账单号 |

**出参**：微信支付转账单查询接口原始返回。

---

### 5. 错误响应格式

所有接口失败时使用统一格式：

```json
{
  "code": -1,
  "msg": "错误原因描述",
  "data": null
}
```

**常见错误**：

| 错误信息 | 原因 |
|---------|------|
| `description（商品描述）必填` | 缺少商品描述 |
| `amount.total（订单金额）必须为正整数（单位：分）` | 金额非整数或为 0/负数 |
| `out_trade_no（商户订单号）长度必须 6-32 位` | 订单号格式错误 |
| `amount.refund（退款金额）不能大于 amount.total（订单金额）` | 退款金额超上限 |
| `wxpay_order 未返回完整 paymentParams` | 微信返回异常，检查 appId/商户号绑定 |

---

### 请求/响应格式

```json
// 下单请求
{ "description": "商品名称", "out_trade_no": "ORDER202604130001",
  "amount": { "total": 100, "currency": "CNY" },
  "payer": { "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o" } }

// 成功响应
{ "code": 0, "msg": "success", "data": { "prepay_id": "wx2014..." } }

// 失败响应
{ "code": -1, "msg": "amount.total（订单金额）必须为正整数（单位：分）", "data": null }

// 回调应答
{ "code": "SUCCESS", "message": "成功" }
```

---

## 注意事项速查

| 事项 | 要点 |
|------|------|
| **AppID 类型** | JSAPI 小程序用小程序 AppID；JSAPI 公众号用已认证服务号 AppID；H5/Native 两种均可 |
| **支付授权目录** | JSAPI/H5/Native 都要配。商户平台 → 产品中心 → 开发配置 → 支付授权目录 |
| **prepay_id 有效期** | 2 小时 |
| **h5_url 有效期** | 5 分钟 |
| **回调超时** | 必须 5 秒内应答，否则微信重试最多 15 次（本模板已实现先应答后处理） |
| **查单兜底** | 回调不保证 100% 送达，建议定时扫描"待支付"订单主动查单 |

> 📖 **40+ 常见问题排查**：[troubleshooting.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/troubleshooting/troubleshooting.md)
>
> 📖 **错误模式深度分析**：[error-patterns.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/troubleshooting/error-patterns.md)

---

## 目录结构

```
pay-common/
├── index.js                        # HTTP 云函数入口（CLI 部署用）
├── app.js                          # Express 入口
├── bin/www                         # 启动脚本
├── scf_bootstrap                   # HTTP 云函数启动脚本（PORT=9000）
├── Dockerfile                      # 云托管构建
├── cloudbaserc.json                # 云函数部署配置
├── .env.example                    # 环境变量模板
├── package.json
├── config/
│   └── config.js                   # 配置管理（双回调模式 + 校验）
├── controllers/
│   └── payController.js            # 路由控制器（下单/查单/退款/回调）
├── services/
│   ├── payService.js               # 支付服务（策略入口，SDK 签名 + 回调模式分叉）
│   ├── orderService.js             # 订单服务（业务钩子，接入数据库）
│   └── strategies/
│       └── sdkStrategy.js          # SDK 签名策略（签名/验签/解密）
├── routes/
│   └── pay.js                      # 路由定义
├── utils/
│   ├── validator.js                # 参数校验
│   └── cloudbaseAuth.js            # CloudBase Auth JWT 解析（获取 openid）
```

---

## 更多资源

| 资源 | 路径 |
|------|------|
| 🏗️ 架构图 | [assets/architecture.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/assets/architecture.md) |
| 🔐 商户凭证准备 | [merchant-credentials.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/template-onboarding/merchant-credentials.md) |
| 📋 方案选型指南 | [cloudbase-pay-overview.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/solution-selection/cloudbase-pay-overview.md) |
| 🛡️ 安全红线 + 上线清单 | [security-checklist.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/business-logic/security-checklist.md) |
| 🔧 诊断脚本 | [scripts/](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/scripts/)（env 校验 / PEM 检查 / 部署配置对比 / 回调连通测试） |

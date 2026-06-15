# pay-common 微信支付通用模板

微信支付 V3 API 的 Express 通用模板，支持多种部署方式和签名模式。

## 特性

- **多平台支付**：JSAPI（小程序/微信内H5）、H5、Native 扫码、APP
- **多部署方式**：HTTP 云函数、云托管（Docker）、本地/自建服务器
- **双回调模式**：SDK 自验签解密 / 集成中心解密（环境变量一键切换，主动请求均走 SDK 自签名）
- **安全**：参数校验、回调验签、时间戳过期检查、幂等提示
- **回调规范**：先应答后处理、JSON 格式应答、签名探测兼容

---

## 快速开始

> 📖 **完整教程**：[skill/cloudbase-wechatpay/references/模板接入/quick-start.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/模板接入/quick-start.md)

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

> 📖 **环境变量完整配置**：[env-config.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/模板接入/env-config.md)
>
> 📖 **SDK vs 网关模式**：[sign-mode.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/模板接入/sign-mode.md)
>
> 📖 **公钥验签 vs 证书验签**：[verify-mode.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/模板接入/verify-mode.md)

#### 环境变量完整配置

> ⚠️ **代码只读 `process.env`，没有 `dotenv`，不会自动加载 `.env` 文件！** `.env.example` 仅作参考模板。

**全量配置项清单**：

| 变量名 | 必填 | 示例值 | 说明 |
|--------|:----:|--------|------|
| `signMode` | 是 | `sdk` / `gateway` | 签名模式。`sdk`=自己验签；`gateway`=集成中心代验签（**默认值**） |
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
<summary>⚡ 最小可用配置（SDK 模式，复制即用）</summary>

```env
signMode=sdk
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

**签名模式速查**：

| 模式 | 主动请求 | 回调处理 | 适用场景 |
|------|---------|---------|---------|
| `sdk` | SDK 自签名 → 直连微信 | 自己验签解密 | 自部署（**必须开 HTTP 访问服务 + 关闭回调路由认证**） |
| `gateway` | SDK 自签名 → 直连微信 | 集成中心已解密 | 控制台集成中心创建（主流） |

### Step 3：部署

| 方式 | 命令 | 详细文档 |
|------|------|---------|
| **HTTP 云函数** | `tcb fn deploy pay-common` | [deploy-cloud-function.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/部署/deploy-cloud-function.md) |
| **云托管** | `tcb cloudrun deploy pay-common --path .` | [deploy-cloud-run.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/部署/deploy-cloud-run.md) |
| **本地开发** | `npm start` → `http://localhost:3000` | [deploy-local.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/部署/deploy-local.md) |

> ⚠️ `cloudbaserc.json` 中 `"type": "HTTP"` 必须声明，否则无法通过 HTTP 访问服务访问。

### Step 4：接入前端

| 场景 | 调用方式 | 详细文档 |
|------|---------|---------|
| **小程序** | `callHTTPFunction`（推荐） | [miniprogram-cloud-api.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/miniprogram-cloud-api.md) |
| **小程序（云托管）** | `callContainer` | [miniprogram-cloud-run.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/miniprogram-cloud-run.md) |
| **H5（微信外浏览器）** | `fetch` → `h5_url` 跳转 | [web-h5.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/web-h5.md) |
| **JSAPI（微信内浏览器）** | `WeixinJSBridge.invoke` | [web-h5.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/web-h5.md) |
| **Native 扫码** | `fetch` → 生成二维码 | [web-native.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/web-native.md) |
| **APP** | 各端 SDK 调起 | [app.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/app.md) |
| **微搭低码** | `callHTTPFunction` | [weda-miniprogram.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/weda-miniprogram.md) |

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

> 📖 **完整文档**：[miniprogram-cloud-api.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/前端集成/miniprogram-cloud-api.md)

### Step 5：接入业务逻辑

编辑 `services/orderService.js`，接入你的数据库。

> 📖 **数据库集成方案**：[order-service.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/业务开发/order-service.md)
>
> 📖 **安全红线 + 上线清单**：[security-checklist.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/业务开发/security-checklist.md)

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
| `handlerUnified(params)` | 下单成功后 | 创建订单记录到数据库 | — |
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
<summary>handlerUnified(params) — 下单参数</summary>

```js
{
    out_trade_no: 'ORDER202604130001',  // 商户订单号
    description: '测试商品',              // 商品描述
    amount: { total: 100, currency: 'CNY' }, // 金额（分）
    payer: { openid: 'oUpF8...' }        // 支付者（JSAPI 必传）
}
```
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
| `/wxpay_order_h5` | POST | H5 下单 | h5SecurityMiddleware |
| `/wxpay_order_native` | POST | Native 扫码下单 | payMiddleware |

### 查询

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_query_order_by_out_trade_no` | POST | 商户订单号查单 | payMiddleware |
| `/wxpay_query_order_by_transaction_id` | POST | 微信订单号查单 | payMiddleware |
| `/wxpay_close_order` | POST | 关闭订单 | payMiddleware |

### 退款

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_refund` | POST | 申请退款 | payMiddleware |
| `/wxpay_refund_query` | POST | 查询退款 | payMiddleware |

### 商家转账

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_transfer` | POST | 发起商家转账 | payMiddleware |
| `/wxpay_transfer_bill_query` | POST | 商户单号查询 | payMiddleware |
| `/wxpay_transfer_bill_query_by_no` | POST | 微信单号查询 | payMiddleware |

> 📖 **商家转账详解**：[transfer.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/业务开发/transfer.md)

### 回调（无鉴权，微信支付服务器直接调用）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/unifiedOrderTrigger` | POST | 支付回调通知 |
| `/refundTrigger` | POST | 退款回调通知 |
| `/transferTrigger` | POST | 商家转账回调通知 |

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

> 📖 **40+ 常见问题排查**：[troubleshooting.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/问题排查/troubleshooting.md)
>
> 📖 **错误模式深度分析**：[error-patterns.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/问题排查/error-patterns.md)

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
| 🔐 商户凭证准备 | [merchant-credentials.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/模板接入/merchant-credentials.md) |
| 📋 方案选型指南 | [cloudbase-pay-overview.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/方案选型/cloudbase-pay-overview.md) |
| 🛡️ 安全红线 + 上线清单 | [security-checklist.md](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/references/业务开发/security-checklist.md) |
| 🔧 诊断脚本 | [scripts/](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/skill/cloudbase-wechatpay/scripts/)（env 校验 / PEM 检查 / 部署配置对比 / 回调连通测试） |

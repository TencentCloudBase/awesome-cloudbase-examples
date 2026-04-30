# pay-common 微信支付通用模板

微信支付 V3 API 的 Express 通用模板，支持多种部署方式和签名模式。

## 特性

- **多平台支付**：JSAPI（小程序/微信内H5）、H5、Native 扫码、APP
- **多部署方式**：HTTP 云函数、云托管（Docker）、本地/自建服务器
- **双回调模式**：SDK 自验签解密 / 集成中心解密（环境变量一键切换，主动请求均走 SDK 自签名）
- **安全**：参数校验、回调验签、时间戳过期检查、幂等提示
- **回调规范**：先应答后处理、JSON 格式应答、签名探测兼容

---

## 使用指南

### 前提条件

1. 已有微信支付商户号（[申请入口](https://pay.weixin.qq.com/)）
2. 已在商户平台获取以下信息：
   - 商户号（mchId）
   - 商户 API 证书序列号（serialNo）
   - 商户 API 证书私钥文件（apiclient_key.pem）
   - 微信支付公钥 + 公钥 ID
   - APIv3 密钥（32 字节）
3. 已有小程序/公众号/移动应用的 AppID，且已绑定商户号
4. 已安装 [CloudBase CLI](https://docs.cloudbase.net/cli-v1/install)（如需部署为云函数）

### ⚠️ 铁律（必须遵守）

> **金额单位 = 分（cents）**：所有涉及金额的字段（`amount.total`、`amount.payer_total`、退款 `amount.refund` 等），单位均为**"分"**而非"元"。例如支付 **1 元**应传 `total: 100`，支付 **9.99 元**应传 `total: 999`。**禁止传入浮点数或元为单位**的值，否则会导致金额错误。

> **订单号全局唯一**：`out_trade_no`（商户订单号）和 `out_refund_no`（商户退款单号）必须**全局唯一**。同一笔订单重复下单会导致微信返回"订单号重复"错误；同一笔退款失败后重试时**必须复用原 `out_refund_no`**（换新单号 = 多退一次钱）。

> **下单与调起使用同一私钥**：下单接口签名和调起支付签名（JSAPI/H5 的 `paySign`、APP 的 `sign`）**必须使用同一把商户 API 私钥**。混用不同证书/私钥会导致调起签名必定失败。

### Step 1：获取模板

```bash
# 从模板库拉取（或直接复制目录）
cp -r pay-common your-project-name
cd your-project-name
```

### Step 2：安装依赖

```bash
npm install
```

### Step 3：配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的商户参数。**根据你的签名模式选择配置项：**

#### SDK 模式（自行签名验签）

> ⚠️ **SDK 模式的回调必须走 HTTP 访问服务**，有 3 个硬性约束：
>
> | # | 约束 | 说明 |
> |---|------|------|
> | 1 | **回调必须走 HTTP 访问服务**，不能走云 API 网关 | 微信支付服务器直接 POST 回调到你的服务，云 API 网关会加鉴权层/修改请求格式，导致微信回调无法到达或验签失败 |
> | 2 | **HTTP 访问服务的回调路由不能开启身份认证** | 微信服务器发来的回调请求不带任何鉴权信息，开了身份认证会被 401/403 拦截，导致回调收不到 |
> | 3 | **回调 URL 必须带完整路径** | HTTP 访问服务的域名带有子路径（如 `/xxx-env/wx-pay/`），环境变量中的 `notifyURL*` 必须包含该完整路径，否则回调 404 |
>
> **简单总结**：SDK 模式 = 开 HTTP 访问服务 → 关掉回调路由的身份认证 → 回调 URL 写完整路径。

```env
signMode=sdk

# 基础信息
appId=YOUR_APP_ID
merchantId=YOUR_MERCHANT_ID
apiV3Key=YOUR_API_V3_KEY

# 凭证（两种模式共用，主动请求均需自签名）
merchantSerialNumber=YOUR_SERIAL_NUMBER
# 私钥（PEM 格式字符串，换行用 \n 表示）
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
# 微信支付公钥（用于验签，不是商户公钥）
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID

# 回调地址（部署后获得的公网 URL + 回调路径）
#
# ⚠️ 重要：如果使用 HTTP 访问服务部署，必须将控制台显示的完整路径包含进去！
# 例如 HTTP 访问服务域名为 https://xxx.cloudbaseasms.com/xxx-env/，
# 则回调 URL 应写为：
#   notifyURLPayURL=https://xxx.cloudbaseasms.com/xxx-env/wx-pay/unifiedOrderTrigger
#                                                ^^^^^^^^
#                              这部分是环境路径，不填会导致回调 404！
#
# ⚠️ 注意：SDK 模式下回调只能走 HTTP 访问服务，不能走云 API 网关。
#   （前端主动调后端接口可以走云 API 网关，但微信服务器回调你的服务必须走 HTTP 访问服务）
notifyURLPayURL=https://你的域名/wx-pay/unifiedOrderTrigger
notifyURLRefundsURL=https://你的域名/wx-pay/refundTrigger
transferNotifyUrl=https://你的域名/wx-pay/transferTrigger

# CORS（可选，仅当前端页面与本服务不同源时配置，多个域名逗号分隔）
corsAllowOrigin=https://your-frontend-domain.com
```

#### 网关模式（默认，集成中心解密回调，主动请求仍走 SDK 自签名）

```env
signMode=gateway

# 基础信息
appId=YOUR_APP_ID
merchantId=YOUR_MERCHANT_ID
apiV3Key=YOUR_API_V3_KEY

# 凭证（两种模式共用，主动请求均需自签名）
merchantSerialNumber=YOUR_SERIAL_NUMBER
# 私钥（PEM 格式字符串，换行用 \n 表示）
privateKey=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_PEM_CONTENT\n-----END PRIVATE KEY-----
# 微信支付公钥（用于验签，不是商户公钥）
wxPayPublicKey=-----BEGIN PUBLIC KEY-----\nYOUR_WX_PAY_PUBLIC_KEY_PEM_CONTENT\n-----END PUBLIC KEY-----
wxPayPublicKeyId=YOUR_WX_PAY_PUBLIC_KEY_ID

# 回调地址（指向集成中心，由集成中心解密后转发明文）
#
# ⚠️ 这些 URL 是在微信支付集成中心（CloudBase 控制台 → 微信支付 → 集成中心）
#   配置/启用后自动生成的，直接复制填入即可，无需手动拼装路径。
#   与 SDK 模式不同，网关模式不需要自己处理回调 URL 的 path 问题。
notifyURLPayURL=https://integration-xxx.tcloudbase.com/wechatpay/order
notifyURLRefundsURL=https://integration-xxx.tcloudbase.com/wechatpay/refund
transferNotifyUrl=https://integration-xxx.tcloudbase.com/wechatpay/transfer

# CORS（可选，仅当前端页面与本服务不同源时配置，多个域名逗号分隔）
corsAllowOrigin=https://your-frontend-domain.com
```

### Step 4：部署

#### 方式一：部署为 HTTP 云函数

1. 编辑 `cloudbaserc.json`，填入你的 `envId`（云开发环境 ID）：

```json
{
  "envId": "your-env-id",
  "functions": [...]
}
```

2. 在 `cloudbaserc.json` 的 `envVariables` 中填入环境变量（或在控制台配置）

3. 部署：

```bash
# 登录 CloudBase
tcb login

# 部署云函数
tcb fn deploy pay-common

# 查看函数列表确认
tcb fn list
```

4. 开启 HTTP 访问服务（控制台操作）：
   - 进入云开发控制台 → 环境 → **HTTP 访问服务**
   - 开启「HTTP 访问服务」或「创建域名关联」
   - 获得公网访问域名，格式为 `https://{envId}.{region}.app.tcloudbase.com`
   - 具体地址请以**控制台显示的完整域名**为准（不同环境格式可能略有差异）

   > ⚠️ **HTTP 访问服务的 URL 带有环境路径**：
   > 控制台显示的域名实际访问时会在后面带上环境标识（如 `/xxx-env/` 或类似子路径）。
   > 这意味着：
   > - 前端调用后端接口时，baseUrl 必须使用**完整路径**
   > - 环境变量中的回调 URL（`notifyURLPayURL` 等）也必须包含这个路径
   > - 否则请求和回调都会返回 404

5. 测试访问：

```bash
# 方式 A：云 API 调用（通过 CloudBase API 网关调用，需鉴权）
#
# 官方文档：https://docs.cloudbase.net/cloud-function/function-calls/
#
# URL 格式：
#   普通云函数：  POST https://{envId}.api.tcloudbasegateway.com/v1/functions/{functionName}
#   HTTP 云函数：POST https://{envId}.api.tcloudbasegateway.com/v1/functions/{functionName}?webfn=true
#                                    ↑ ↑
#                         HTTP 函数必须带此参数，否则网关会按普通函数处理
#
# 必填请求头：
#   Authorization: Bearer {access_token}    （通过 CloudBase Auth 登录获取）
#   Content-Type: application/json
#
# 可选请求头：
#   Accept: application/json                （建议携带）
#   X-Qualifier: $LATEST 或具体版本号       （指定函数版本，默认 $LATEST）
#
# pay-common 特殊说明（非 CloudBase 平台要求，是本模板的设计约定）：
#   - 网关会将请求路径截断为 /，所以通过 body._action 字段指定实际路由名
#     （如 wxpay_order、wxpay_refund、wxpay_transfer 等，支持短名）
#   - 响应为双层结构：{ code, data: { status: HTTP状态码, data: <业务数据> } }
#     外层是网关信封，内层才是 pay-common 的业务返回，使用时需解包
#
# 需先获取 accessToken（替换下方 <ACCESS_TOKEN> 和 <ENV_ID>）：
curl -L 'https://<ENV_ID>.api.tcloudbasegateway.com/v1/functions/pay-common?webfn=true' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -d '{"_action":"wxpay_order","description":"测试商品","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"oUpF8xxx"}}'

# 方式 B：HTTP 访问服务调用（需在控制台开启，直接用公网域名，无需 Token 鉴权）
#
# 域名从控制台「HTTP 访问服务」页面获取，替换下方 <YOUR_HTTP_DOMAIN>：
curl -X POST https://<YOUR_HTTP_DOMAIN>/wx-pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{"description":"测试商品","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"oUpF8xxx"}}'

# 方式 C：本地开发调试
npm start
# 服务启动在 http://localhost:3000
curl -X POST http://localhost:3000/wx-pay/wxpay_order \
  -H "Content-Type: application/json" \
  -d '{"description":"测试商品","amount":{"total":1,"currency":"CNY"},"payer":{"openid":"oUpF8xxx"}}'
```

#### 方式二：部署为云托管

```bash
tcb cloudrun deploy pay-common --path .
```

#### 方式三：本地开发

```bash
npm start
# 服务启动在 http://localhost:3000
# 访问 http://localhost:3000/wx-pay/wxpay_order
```

### Step 5：接入前端

部署成功后，在前端代码中调用对应接口。

> **完整可运行示例**：
>
> | 示例 | 调用方式 | 路径 |
> |------|---------|------|
> | 小程序（云函数版） | 云 API 网关 / HTTP 访问服务 | [`example/miniprogram/`](../example/miniprogram/) |
> | 小程序（云托管版） | 云托管 callContainer | [`example/miniprogram-cloudrun/`](../example/miniprogram-cloudrun/) |

#### 小程序调用

> 完整示例代码见各调用方式章节下方（小程序/H5/Web/Native 均有示例）。

**方式一：云 API 调用（通过 CloudBase API 网关，需鉴权）**

> 通过 CloudBase **API 网关**调用 HTTP 云函数，无需开启 HTTP 访问服务。
> 适合小程序场景：使用 CloudBase Auth 获取 `accessToken` 后即可调用。
> 官方文档：https://docs.cloudbase.net/cloud-function/function-calls/
>
> 完整可运行示例代码见 [`example/miniprogram/`](../example/miniprogram/)（云函数版小程序模板）。

**调用格式**：

```
POST https://{envId}.api.tcloudbasegateway.com/v1/functions/{functionName}?webfn=true
Headers: Authorization: Bearer {access_token}
         Content-Type: application/json
         Accept: application/json        （建议携带）
         X-Qualifier: $LATEST / 版本号    （可选，指定函数版本）
Body:    { _action: "路由名", ...业务参数 }
```

**关键要点（分清「平台能力」和「模板约定」）**：

| 项目 | 说明 | 来源 |
|------|------|------|
| 网关域名 | 固定 `api.tcloudbasegateway.com` | **CloudBase 平台** |
| `?webfn=true` | **必须带此参数**，否则网关会按普通函数（非HTTP）处理 | **CloudBase 平台** |
| 鉴权 | Bearer Token（通过 CloudBase Auth 登录获取） | **CloudBase 平台** |
| `X-Qualifier` | 可选头，指定函数版本号或 `$LATEST`（默认） | **CloudBase 平台** |
| `_action` 路由分发 | 通过 `body._action` 指定实际路由名（如 `wxpay_order`、`wxpay_refund`） | **pay-common 模板约定** |
| 双层响应结构 | `{ code, data: { status: 200, data: <业务数据> } }`，需解包内层 | **pay-common 模板约定**（网关截断路径后包装的响应信封） |

```javascript
// --- app.js：登录获取 accessToken ---
const cloudbase = require('@cloudbase/js-sdk')  // npm install @cloudbase/js-sdk
const ENV_ID = 'your-env-id'

App({
  globalData: { accessToken: '', openid: '', loginReady: false },
  _cbApp: null,

  async onLaunch() {
    // 初始化 SDK 并静默登录（signInWithOpenId 无需额外配置，只需开启小程序身份源）
    if (!this._cbApp) {
      this._cbApp = cloudbase.init({ env: ENV_ID })
    }
    const { data, error } = await this._cbApp.auth.signInWithOpenId()
    if (!error && data) {
      this.globalData.accessToken = data.session?.access_token || ''
      this.globalData.openid = data.user?.identities?.[0]?.identity_data?.provider_user_id || ''
    }
    this.globalData.loginReady = true
  },
})

// --- 页面中：调用 pay-common ---
const app = getApp()
const API_GATEWAY = `https://${app.globalData.envId || 'your-env-id'}.api.tcloudbasegateway.com`

/**
 * 云 API 统一调用函数
 * 网关会将路径截断为 /，所以通过 body._action 传递实际路由
 * 响应为双层结构，需解包内层 {status, data} 信封
 */
function callPayCommon(action, data) {
  return app.getAccessToken().then((accessToken) => {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_GATEWAY}/v1/functions/pay-common?webfn=true`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        data: { _action: action, ...data },
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 解包双层响应：{ code, data: { status, data: <业务数据> } } → { code, data: <业务数据> }
            let payload = res.data
            const inner = payload && payload.data
            if (inner && typeof inner === 'object'
                && 'status' in inner && 'data' in inner) {
              payload = { ...payload, data: inner.data }
            }
            resolve(payload)
          } else if (res.statusCode === 401 || res.statusCode === 403) {
            reject({ code: -1, msg: `鉴权失败 HTTP ${res.statusCode}` })
          } else {
            reject({ code: -1, msg: `HTTP ${res.statusCode}`, data: res.data })
          }
        },
        fail: reject,
      })
    })
  })
}

// 下单示例
const res = await callPayCommon('wxpay_order', {
  description: '商品名称',
  out_trade_no: 'ORDER202604130001',
  amount: { total: 100, currency: 'CNY' },
  payer: { openid: app.globalData.openid },
})
if (res.code === 0) {
  const payData = res.data?.data || res.data
  wx.requestPayment({
    timeStamp: payData.timeStamp,
    nonceStr: payData.nonceStr,
    package: payData.package || ('prepay_id=' + payData.prepay_id),
    signType: 'RSA',
    paySign: payData.paySign,
  })
}
```

> **说明**：
> - 云 API 调用固定走网关域名 `tcloudbasegateway.com`，URL 路径固定为 `/v1/functions/pay-common`
> - `?webfn=true` 是 CloudBase 平台要求——调用 HTTP 云函数时**必须带此参数**（官方文档）
> - 可选头 `X-Qualifier` 可指定函数版本（如 `$LATEST`），不传则默认最新
> - 通过 `body._action` 字段指定实际路由（短名如 `wxpay_order`、`wxpay_refund`、`wxpay_transfer` 等）——这是 pay-common 模板的约定，不是平台要求
> - `accessToken` 由 CloudBase Auth 的 `signInWithOpenId()` 获取，JWT 中包含 `provider_sub`（即 openid）
> - 后端可从 JWT 自动提取 openid，无需前端传入 payer.openid
> - 响应为双层结构（网关会包一层 `{status, data}`），需解包后才是业务数据——这也是 pay-common 模板的行为
> - 需要在小程序管理后台将 `https://<ENV_ID>.api.tcloudbasegateway.com` 加入 **request 合法域名**

**方式二：HTTP 访问服务直接调用（备选，需开启 HTTP 访问服务）**

> 通过控制台「HTTP 访问服务」获得的公网域名直接调用，无需 accessToken 鉴权。
> 域名格式一般为 `https://{envId}.{region}.app.tcloudbase.com`，以**控制台实际显示为准**。

```javascript
// 直接用 wx.request 调用公网域名，不需要 accessToken
const HTTP_BASE = 'https://<YOUR_HTTP_DOMAIN>'  // 替换为控制台获取的完整域名
const res = await new Promise((resolve, reject) => {
  wx.request({
    url: `${HTTP_BASE}/wx-pay/wxpay_order`,
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    data: {
      description: '商品名称',
      out_trade_no: 'ORDER202604130001',
      amount: { total: 100, currency: 'CNY' },
      payer: { openid: '用户openid' }
    },
    success(res) { resolve(res.data) },
    fail: reject,
  })
})
```

> **注意**：
> - 使用 HTTP 访问服务时，需要将**控制台显示的完整域名**加入小程序管理后台的 request 合法域名
> - **测试阶段**：可在控制台 HTTP 访问服务配置中关闭身份认证，无需 accessToken 即可快速验证接口
> - **生产环境**：务必开启身份认证，否则任何人都能直接调用你的支付接口
> - **SDK 验签模式下（重要！）**：
>   - 支付/退款/转账的**回调路由必须走 HTTP 访问服务**，不能走云 API 网关
>   - HTTP 访问服务的**回调路由（`unifiedOrderTrigger`、`refundTrigger`、`transferTrigger`）不能开启身份认证**
>   - 原因：微信支付服务器直接 POST 回调请求到你的服务，不带任何鉴权 Token；云 API 网关会拦截或篡改请求格式，导致验签失败或回调收不到

**方式三：云托管 callContainer**

> 完整可运行示例代码见 [`example/miniprogram-cloudrun/`](../example/miniprogram-cloudrun/)（云托管版小程序模板）。

```javascript
// 下单
const orderRes = await wx.cloud.callContainer({
  path: '/wx-pay/wxpay_order',
  method: 'POST',
  header: { 'X-WX-SERVICE': 'pay-common' },
  data: {
    description: '商品名称',
    out_trade_no: 'ORDER202604130001',
    amount: { total: 100, currency: 'CNY' },
    payer: { openid: '用户openid' }
  }
})

if (orderRes.data.code === 0) {
  // 调起支付
  const payData = orderRes.data.data.data
  wx.requestPayment({
    timeStamp: payData.timeStamp,
    nonceStr: payData.nonceStr,
    package: payData.package,
    signType: 'RSA',
    paySign: payData.paySign,
    success: () => {
      // 支付成功（建议主动查单确认，前端回调不保证可靠）
    },
    fail: (err) => {
      if (err.errMsg.includes('cancel')) {
        console.log('用户取消支付')
      }
    }
  })
}
```

> **说明**：`callContainer` 走 CloudBase SDK 内部通道，**不需要**在小程序管理后台添加 request 合法域名。

#### Web 调用（H5 外浏览器）

> **域名**：替换为控制台「HTTP 访问服务」获取的完整公网地址
> 适用场景：用户在**微信外浏览器**（Safari、Chrome 等）访问 H5 页面并调起支付。
>
> **⚠️ 支付授权目录**：
> - 必须在**[微信支付商户平台](https://pay.weixin.qq.com) → 产品中心 → 开发配置 → 支付授权目录**中添加你的域名路径
> - 格式示例：`https://<YOUR_HTTP_DOMAIN>/`（注意末尾的 `/`，支持到二级/三级目录，替换为控制台获取的实际域名）
> - 未配置或目录不匹配时，微信支付会返回错误码 `USERPAYMENT_INVOKE_ERROR`
> - 每个商户号最多可配置 **5 个**支付授权目录
>
> **⚠️ H5 下单前必须验证用户登录态**：微信支付规范要求 H5 场景下服务端必须校验用户身份（如 session/Cookie/Token），防止未登录用户发起下单。建议在下单路由中增加鉴权中间件，确保请求来自已登录用户。

```javascript
const BASE_URL = 'https://<YOUR_HTTP_DOMAIN>/wx-pay'  // 替换为控制台获取的完整域名

const res = await fetch(`${BASE_URL}/wxpay_order_h5`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: '商品名称',
    out_trade_no: 'ORDER202604130002',
    amount: { total: 100, currency: 'CNY' },
    scene_info: {
      payer_client_ip: '用户真实IP',   // ⚠️ 必填，微信风控要求
      h5_info: { type: 'Wap' }         // ⚠️ 必填，场景类型
    }
  })
})

const data = await res.json()
if (data.code === 0) {
  // 跳转到微信支付中间页（外浏览器拉起微信）
  const h5Url = data.data.h5_url || data.data.data.h5_url
  window.location.href = h5Url
}
```

#### Web 调用（JSAPI — 微信内浏览器 / 服务号网页）

> **适用场景**：用户在**微信内置浏览器**中访问公众号网页，需要调起微信支付（JSAPI）。
> 这是与「H5 外浏览器」完全不同的场景——H5 走的是 `h5_url` 中间页跳转，而 JSAPI 是直接在微信内唤起收银台。
>
> **核心区别**：
>
> | 对比项 | H5（外浏览器） | JSAPI（微信内） |
> |--------|---------------|----------------|
> | 浏览器环境 | 微信外的 Safari/Chrome 等 | 微信内置浏览器 |
> | 下单接口 | `/wxpay_order_h5` | `/wxpay_order`（JSAPI 接口） |
> | 调起方式 | 返回 `h5_url` 跳转 | `WeixinJSBridge.invoke('getBrandWCPayRequest', ...)` |
> | openid 来源 | 不需要 openid | 必须 openid（来自 OAuth2 静默授权） |
> | 支付授权目录 | 商户平台配置 | 商户平台配置 + 公众号需已认证 |
> | appId 要求 | 公众号 AppID 或小程序 AppID | **必须是已认证的服务号 AppID** |

##### 前置条件

1. **拥有已认证的服务号**（订阅号不支持 JSAPI 支付）
2. **服务号 AppID 已绑定微信支付商户号**（在 [微信支付商户平台](https://pay.weixin.qq.com) → 账号中心 → 关联应用）
3. **配置支付授权目录**（见下方详细说明）
4. **配置 OAuth2 网页授权域名**
   - 进入 [公众平台](https://mp.weixin.qq.com) → 设置与开发 → 公众号设置 → 功能设置 → 网页授权域名
   - 将你的业务域名加入白名单（格式：`your-domain.com`，不含协议和端口）
   - ⚠️ 此域名必须**已在 ICP 备案**且通过微信验证（文件校验或 DNS 校验）
   - ⚠️ OAuth2 授权链接中的 `redirect_uri` 域名必须在此白名单内，**局域网 IP 不行**
   - 本地开发时需用公网域名（如绑定自定义域名的 CloudBase 环境）或 ngrok/内网穿透工具
5. **配置 JS接口安全域名**
   - 同上入口：公众平台 → 设置与开发 → 公众号设置 → 功能设置 → **JS接口安全域名**
   - 将你的业务域名加入白名单
   - ⚠️ JSAPI 支付调起 `wx.requestPayment()` 时会校验此域名，未配置会导致调起失败

##### ⚠️ 支付授权目录（重要！必配！）

> **这是最容易被遗漏的步骤，配置不当会导致支付报错"当前页面URL的域不在以下支付授权目录中"。**
>
> 配置入口：**[微信支付商户平台](https://pay.weixin.qq.com)** → 产品中心 → 开发配置 → **支付授权目录**
>
> **规则说明**：
> - 格式：`https://域名/路径/`（末尾必须有 `/`，支持精确到二级/三级目录）
> - 示例：
>   ```
>   https://www.example.com/
>   https://www.example.com/shop/
>   https://pay.example.com/
>   ```
> - 匹配逻辑：**前缀匹配**。如果配置了 `https://example.com/pay/`，那么 `https://example.com/pay/order.html` 可以发起支付，但 `https://example.com/shop/` 不行
> - 每个商户号最多 **5 个**目录
> - ⚠️ **测试阶段**：如果使用的是 CloudBase HTTP 访问服务的临时域名（`.app.tcloudbase.com`），该域名**不在微信白名单内**，可能无法通过支付授权目录校验。建议：
>   - 绑定自定义域名后再进行正式测试
>   - 或在商户平台申请添加该域名到支付授权目录（部分情况下 `.app.tcloudbase.com` 域名可被接受）
>
> **常见错误码及排查**：
>
> | 错误信息 | 原因 | 解决方案 |
> |---------|------|---------|
> | 当前页面 URL 的域不在以下支付授权目录中 | 未配置或 URL 不在目录范围内 | 在商户平台添加对应目录 |
> | 缺少参数 package | JSAPI 调起参数有误 | 检查 prepay_id、appId、timeStamp、nonceStr、paySign 五个参数是否齐全 |
> | appid 和 mch_id 不匹配 | 下单使用的 appId 与绑定的商户号不一致 | 检查环境变量 `appId` 是否与服务号 AppID 一致 |

##### 完整接入流程

```
用户在微信内打开网页
       ↓
① 页面跳转到 OAuth2 授权链接（静默授权，用户无感知）
   https://open.weixin.qq.com/connect/oauth2/authorize?
     appid=APPID&redirect_uri=REDIRECT_URI&response_type=code&scope=snsapi_base#wechat_redirect
       ↓
② 微信回调带回 code 参数
       ↓
③ 后端用 code 换取 access_token + openid
   GET https://api.weixin.qq.com/sns/oauth2/access_token?
     appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
       ↓
④ 用 openid 调用 pay-common 的 wxpay_order 接口（JSAPI 下单）
       ↓
⑤ 返回 prepay_id 及签名参数
       ↓
⑥ 前端调用 WeixinJSBridge 唤起微信支付收银台
```

##### 前端代码示例

```javascript
// ===== 第一步：OAuth2 获取 openid（页面加载时执行）======
// 注意：code 只能使用一次，且有效期约 5 分钟

const APPID = '你的服务号AppID'
let openid = null

async function getOpenId() {
  // 先检查 localStorage 缓存
  const cached = localStorage.getItem('openid')
  if (cached) return cached

  // 从 URL 参数获取 code（OAuth2 回调时会带 code）
  const urlParams = new URLSearchParams(window.location.search)
  let code = urlParams.get('code')

  if (!code) {
    // 没有 code，跳转到微信授权页（snsapi_base = 静默授权，用户无感知）
    const redirectUri = encodeURIComponent(window.location.href)
    window.location.replace(
      `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect`
    )
    return null  // 会跳走，不会真正返回
  }

  // 有 code，换取 openid（建议由你自己的后端代理此请求，不要在前端暴露 appsecret）
  const res = await fetch('/api/auth/wx-openid?code=' + code)
  const data = await res.json()
  if (data.openid) {
    openid = data.openid
    localStorage.setItem('openid', openid)
    // 清理 URL 中的 code 参数（安全考虑）
    history.replaceState({}, '', window.location.pathname)
  }
  return openid
}

// ===== 第二步：调用 JSAPI 下单 ======

const BASE_URL = 'https://<YOUR_HTTP_DOMAIN>/wx-pay'

// 用户点击"去支付"
document.getElementById('btn-pay').onclick = async function () {
  // 1. 确保 openid 已获取
  openid = openid || await getOpenId()
  if (!openid) return  // 正在授权跳转中

  // 2. 调用 pay-common 下单接口（JSAPI，注意不是 _h5）
  const res = await fetch(`${BASE_URL}/wxpay_order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: '商品名称',
      out_trade_no: 'ORDER' + Date.now(),
      amount: { total: 100, currency: 'CNY' },  // 1 元 = 100 分
      payer: { openid }                           // ← 必传 openid
    })
  })

  const data = await res.json()
  if (data.code !== 0) {
    alert(data.msg || '下单失败')
    return
  }

  // 3. 获取签名参数
  const payData = data.data?.data || data.data
  if (!payData?.prepay_id) {
    alert('下单成功但缺少支付参数')
    return
  }

  // 4. 在微信内置浏览器中唤起支付
  function onBridgeReady() {
    WeixinJSBridge.invoke('getBrandWCPayRequest', {
      appId: payData.appId,
      timeStamp: String(payData.timeStamp),
      nonceStr: payData.nonceStr,
      package: payData.package || ('prepay_id=' + payData.prepay_id),
      signType: payData.signType || 'RSA',
      paySign: payData.paySign
    }, function(res) {
      if (res.err_msg === 'get_brand_wcpay_request:ok') {
        // 支付成功（建议主动查单确认）
        alert('支付成功')
        location.reload()
      } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
        alert('用户取消支付')
      } else {
        alert('支付失败: ' + res.err_msg)
      }
    })
  }

  if (typeof WeixinJSBridge === 'undefined') {
    document.addEventListener('WeixinJSBridgeReady', onBridgeReady)
  } else {
    onBridgeReady()
  }
}

// 页面初始化时预获取 openid
getOpenId()
```

##### 后端代理换取 openid（示例）

```javascript
// 你的后端 API：/api/auth/wx-openid
// 注意：不要在前端暴露 appsecret！

const axios = require('axios')

exports.handler = async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'missing code' })

  // 用 code + appsecret 换取 openid
  const wxRes = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
    params: {
      appid: process.env.WX_MP_APPID,          // 服务号 AppID
      secret: process.env.WX_MP_APPSECRET,      // 服务号 AppSecret（敏感！仅后端持有）
      code,
      grant_type: 'authorization_code'
    }
  })

  if (wxRes.data.errcode) {
    return res.status(500).json({ error: wxRes.data.errmsg })
  }

  res.json({
    openid: wxRes.data.openid,
    access_token: wxRes.data.access_token
  })
}
```

> **关键提醒**：
> - **appsecret 绝对不能暴露给前端**！必须由你自己的后端代理换取 openid
> - OAuth2 的 `scope=snsapi_base` 是**静默授权**（用户无感知），只能获取 openid；如需获取昵称/头像等用户信息，改用 `scope=snsapi_userinfo`（会弹窗让用户确认）
> - `code` 只能使用一次，换取后即失效
> - `access_token` 有效期 **2 小时**，openid 可长期缓存使用

#### Web 调用（Native 扫码）

> **域名**：替换为控制台「HTTP 访问服务」获取的完整公网地址
> 适用场景：PC 网页、线下收银台、POS 机等用户使用微信"扫一扫"支付的场合。

```javascript
const BASE_URL = 'https://<YOUR_HTTP_DOMAIN>/wx-pay'  // 替换为控制台获取的完整域名

const res = await fetch(`${BASE_URL}/wxpay_order_native`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: '商品名称',
    out_trade_no: 'ORDER202604130003',
    amount: { total: 100, currency: 'CNY' },
    scene_info: {
      payer_client_ip: '用户真实IP',   // ⚠️ 必填，微信风控要求
    }
  })
})

const data = await res.json()
if (data.code === 0) {
  // 用 code_url 生成二维码展示给用户扫码
  const codeUrl = data.data.code_url || data.data.data.code_url
  // code_url 格式为 weixin://wxpay/bizpayurl?pr=xxxx（微信协议 URL）
  // 需用二维码库（如 qrcode.js / qrcode-terminal）将其转为二维码图片/Canvas 展示
  generateQRCode(codeUrl)

  // ⚠️ 扫码后需主动轮询查单（前端无法实时感知支付结果）
  startPolling(out_trade_no)
}
```

> **Native 扫码注意事项**：
>
> - **无需 openid**：Native 模式是用户扫码支付，下单时不需要 `payer.openid`
> - **payer_client_ip 必填**：微信风控要求必须传入用户真实 IP（`scene_info.payer_client_ip`），否则可能被拒绝下单或触发风控拦截。Web 端可通过服务端从请求头 `X-Forwarded-For` 或 `X-Real-IP` 获取；如果 pay-common 本身作为 Web 后端，可直接读取客户端 IP 赋值
> - **code_url 有效期约 2 小时**：过期后用户扫码将无法完成支付，需重新下单
> - **前端无法实时获知支付结果**：用户扫码支付完成后，前端只能通过**主动轮询查单接口**（`wxpay_query_order_by_out_trade_no`）来确认支付状态，建议间隔 2-3 秒轮询，最多轮询 30 次（约 90 秒）
> - **支付结果以回调为准**：最终支付成功/失败应以后端收到的微信支付回调通知为准，前端轮询仅用于 UI 展示（如跳转"支付成功"页面）
> - **防重复支付提示**：轮询到已支付状态后应停止轮询并提示用户，避免用户重复扫码
```


### Step 6：接入业务逻辑


编辑 `services/orderService.js`，接入你的数据库：
}
```

### Step 6：接入业务逻辑

编辑 `services/orderService.js`，接入你的数据库：

```javascript
class OrderService {
  async handlerUnified(params) {
    // 下单成功 → 插入订单到数据库
    await db.collection('orders').add({
      out_trade_no: params.out_trade_no,
      description: params.description,
      amount: params.amount.total,
      status: 'PENDING',
      created_at: new Date()
    })
    return true
  }

  async handlerUnifiedTrigger(params) {
    // ⚠️ 必须幂等：先查状态，已处理则跳过
    const order = await db.collection('orders')
      .where({ out_trade_no: params.out_trade_no })
      .get()

    if (order.data[0]?.status === 'PAID') {
      return true  // 已处理，跳过
    }

    // 校验金额
    if (order.data[0]?.amount !== params.amount.total) {
      console.error('金额不一致！可能被篡改')
      return false
    }

    // 更新订单状态
    await db.collection('orders')
      .where({ out_trade_no: params.out_trade_no })
      .update({ status: 'PAID', paid_at: new Date() })

    // 发货 / 发放权益 ...
    return true
  }
}
```

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

> **⚠️ 退款注意事项**：
> - **部分退款次数上限**：同一笔支付订单最多支持 **50 次**部分退款，超过此限制需走全额退款后重新下单
> - **退款金额单位也是"分"**：与支付一致，退款金额 `amount.refund` 单位为分
> - **退款失败重试**：必须**复用原 `out_refund_no`**（见上方铁律），否则会多退一笔

### 对账（账单）

> 生产环境上线后，建议每日拉取微信账单与本地订单进行对账：
>
> - **拉取时间**：次日 **10:00 后**（微信账单有延迟）
> - **⚠️ 注意单位差异**：微信下载的账单文件中金额单位为**"元"**（含小数点），而 API 接口返回/传入的单位为**"分"**（整数），对账前必须统一换算
> - 本模板暂未内置账单下载接口，可通过微信支付 API 手动拉取或自行对接

### 商家转账（升级版 - 单笔模式）

| 路由 | 方法 | 说明 | 鉴权 |
|------|------|------|------|
| `/wxpay_transfer` | POST | 发起商家转账 | payMiddleware |
| `/wxpay_transfer_bill_query` | POST | 商户单号查询转账单 | payMiddleware |
| `/wxpay_transfer_bill_query_by_no` | POST | 微信单号查询转账单 | payMiddleware |
| `/wxpay_transfer_batch_query` | POST | ~~兼容旧路由~~（等同 `transfer_bill_query`） | payMiddleware |

> ⚠️ **商家转账接口使用说明**
>
> 本模板使用的是**升级版商家转账**接口（单笔模式），**仅支持免密小额转账**场景：
>
> - ✅ **单笔金额范围**：`0.3 元 ≤ 金额 < 2000 元`（即 30 分 ≤ `transfer_amount` < 200000 分）
> - ✅ **不填写** `user_name`（收款人姓名）
> - ✅ `transfer_remark`（转账备注）最多 32 个字符
>
> **不支持的场景（会被校验拦截）**：
>
> - ❌ 单笔金额 ≥ 2000 元
> - ❌ 请求中包含 `user_name` 字段
>
> **原因**：
>
> 微信支付规定，≥ 2000 元转账必须传 `user_name`（收款人姓名）并做校验，而 `user_name` 是**敏感字段**，需使用微信支付公钥进行 `RSA/OAEP` 加密。本模板**未实现**敏感字段加密逻辑，避免明文上送导致鉴权失败。
>
> **重要规则**：
>
> - 受理成功（`ACCEPTED`）**≠ 转账成功**，必须通过查单或回调确认最终状态
> - 遇到 `SYSTEM_ERROR` / `ACCEPTED` / 频率超限时，**必须用相同参数 + 相同单号重试**，不可换单
> - 同一 `out_bill_no` 重试期为 **3 个自然日**，超期需换新单号
> - 用户 **24 小时**内未确认收款，系统自动关单退款
>
> **如何扩展支持 ≥ 2000 元转账**：
>
> 请参考 `services/strategies/sdkStrategy.js` 中 `transfer()` 方法的注释，自行实现以下改造：
>
> 1. 用 `crypto.publicEncrypt` 结合微信支付公钥加密 `user_name`（`RSA_PKCS1_OAEP_PADDING` + `SHA-1`）
> 2. 对 `user_name` 参数先加密再入参
> 3. 同步放开 `utils/validator.js` 中的 `user_name` 和金额上限校验
>
> **参考官方文档**：
>
> - 发起商家转账（升级版）：https://pay.weixin.qq.com/doc/v3/merchant/4012716434
> - 敏感信息加密规范：https://pay.weixin.qq.com/doc/v3/merchant/4013053257
> - 开发指引：https://pay.weixin.qq.com/doc/v3/merchant/4012715211

### 账单下载

> 本模板暂未内置账单下载接口，但你可以通过以下方式获取：

> **方式一：微信支付商户平台**
>
> 登录 [pay.weixin.qq.com](https://pay.weixin.qq.com) → **交易中心 → 账单下载**，选择日期和类型（交易资金/资金流水/退款），手动下载。
>
> **方式二：账单下载 API（推荐自动化场景）**
>
> ```
> # 申请下载（返回下载地址）
> POST https://api.mch.weixin.qq.com/v3/billdownload/trade-bills
> Authorization: WECHATPAY2-SHA256-RSA2048 ...
> Body: { "bill_date": "2026-04-29", "bill_type": "ALL" }
>
> # bill_date 格式：YYYY-MM-DD（只能下载前一天及之前的账单）
> # bill_type 可选：ALL | SUCCESS | REFUND
> # 返回的 download_url 有效期约 10 分钟
> ```
>
> **注意事项**：
> - 账单金额单位是**元**（不是分），与下单 API 不同！
> - 账单文件为 **gzip 压缩**的 CSV/TXT，需解压后解析
> - 下载 URL 有时效性，不要缓存复用
> - 完整接口文档：[账单下载](https://pay.weixin.qq.com/docs/merchant/apis/bill-download/trade-bills.html)

### 回调（无鉴权，微信支付服务器直接调用）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/unifiedOrderTrigger` | POST | 支付回调通知 |
| `/refundTrigger` | POST | 退款回调通知 |
| `/transferTrigger` | POST | 商家转账回调通知 |

### 请求/响应格式

**下单请求示例：**

```json
{
  "description": "商品名称",
  "out_trade_no": "ORDER202604130001",
  "amount": { "total": 100, "currency": "CNY" },
  "payer": { "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o" }
}
```

**成功响应：**

```json
{
  "code": 0,
  "msg": "success",
  "data": { "prepay_id": "wx201410272009395522657a690389285100", ... }
}
```

**失败响应：**

```json
{
  "code": -1,
  "msg": "amount.total（订单金额）必须为正整数（单位：分）",
  "data": null
}
```

**回调应答：**

```json
{ "code": "SUCCESS", "message": "成功" }
```

---

## ⚠️ 注意事项

### AppID 类型对应关系

不同支付方式需要不同类型的 AppID，**不能混用**：

| 支付方式 | AppID 类型 | 调起方式 | 必需 openid |
|---------|-----------|---------|------------|
| JSAPI（小程序） | **小程序** AppID | `wx.requestPayment` | 是（自动获取） |
| JSAPI（公众号网页，微信内浏览器） | **已认证的服务号** AppID | `WeixinJSBridge.invoke` | 是（需 OAuth2 获取） |
| H5（微信外浏览器） | 公众号/小程序 AppID 均可 | 跳转 `h5_url` 中间页 | 否 |
| Native 扫码 | 公众号或小程序 AppID 均可 | 展示二维码扫码 | 否 |

> **JSAPI vs H5 的核心区别**：
> - **JSAPI**：用户在**微信内置浏览器**中，直接唤起收银台。需要服务号 + OAuth2 openid + 配置支付授权目录。
> - **H5**：用户在**微信外浏览器**（如手机 Safari），点击后跳转到微信中间页再拉起微信。不需要 openid 但必须传 `scene_info`（IP + h5_info）。

### ⚠️ 支付授权目录（H5 和 Native 必配！）

> **JSAPI、H5、Native 三种方式都需要配置支付授权目录**，这是最容易被遗漏的步骤！
>
> 配置入口：**[微信支付商户平台](https://pay.weixin.qq.com)** → 产品中心 → 开发配置 → **支付授权目录**
>
> | 支付方式 | 是否必须配置 | 配置内容 | 常见报错 |
> |---------|:-----------:|---------|---------|
> | **JSAPI** | ✅ 是 | 公众号域名路径 | 「当前页面 URL 的域不在以下支付授权目录中」 |
> | **H5** | ✅ **是** | 你的业务域名路径 | 同上 |
> | **Native 扫码** | ✅ **是** | 展示二维码的页面域名 | 二维码无法正常拉起微信 |
>
> 规则：
> - 格式：`https://域名/路径/`（末尾必须有 `/`，支持精确到二级/三级目录）
> - 每个商户号最多可配置 **5 个**
> - 如果使用 CloudBase HTTP 访问服务的临时域名，需将完整 URL（含 path）添加进去
>
> 详见 §Step 5 中各支付方式的「⚠️ 支付授权目录」详细说明。

### 有效期

| 参数 | 有效期 | 说明 |
|------|--------|------|
| `prepay_id` | 2 小时 | 过期需重新下单 |
| `h5_url` | 5 分钟 | 过期需重新下单 |

### 查单兜底

微信支付回调不保证 100% 送达。建议实现定时/延迟查单兜底：

```javascript
// 每 5 分钟扫描"待支付"且下单超过 10 分钟的订单
// 主动调 /wxpay_query_order_by_out_trade_no 查询真实状态
// 如果已支付 → 执行发货
// 如果超时未支付 → 调 /wxpay_close_order 关闭订单
```

### 回调处理要求

> **⚠️ 回调必须在 5 秒内返回应答**：微信支付要求回调接口在 **5 秒内**返回 `{code: "SUCCESS", message: "成功"}`。超时未返回时微信会认为失败并按以下频次重试：
>
> | 重试次数 | 间隔 |
> |---------|------|
> | 第 1-2 次 | 15 秒 |
> | 第 3 次 | 30 秒 |
> | 第 4 次 | 3 分钟 |
> | 第 5-6 次 | 10 分钟 |
> | ... | 逐步拉长，最长间隔 **6 小时**，共重试约 **15 次** |
>
> 本模板已实现"先应答后处理"机制（收到回调后立即返回成功，再异步执行业务逻辑），可确保满足此要求。

### 回调 IP 白名单

如果部署环境有防火墙或安全组，需开通微信支付回调 IP 段白名单。核心 IP 段如下：

| 用途 | IP 段 |
|------|-------|
| 支付回调（上海） | `101.226.33.0/24`、`101.226.72.0/24`、`58.250.106.0/24` |
| 支付回调（深圳） | `183.131.95.0/24`、`121.14.96.0/24`、`183.232.238.0/24` |
| 支付回调（广州腾讯云） | `43.142.194.0/24`、`119.147.79.0/24`、`43.163.241.0/24` |
| 退款回调专用 | `101.226.33.0/24`、`101.226.77.0/24`、`58.252.81.0/24`、`58.252.97.0/24`、`183.131.95.0/24`、`121.14.76.0/24` |

> 完整列表请以[微信支付官方文档](https://pay.weixin.qq.com/docs/merchant/development/interface-rules/introduction.html)为准。

---

## 签名模式详解

通过环境变量 `signMode` 切换（仅影响回调处理方式，主动请求均走 SDK 自签名直连微信）：

| 模式 | 主动请求（下单/退款/转账） | 回调处理 | 适用场景 | 部署要求 |
|------|---------|---------|---------|---------|
| `sdk` | SDK 自签名 → 直连微信 | 自己验签 + AES-GCM 解密 | 需要完整控制回调数据 | **必须开 HTTP 访问服务 + 关闭回调路由身份认证** |
| `gateway` | SDK 自签名 → 直连微信 | 集成中心已解密，读取明文（x-tcb-wechatpay-decrypted） | 快速接入，无需自处理验签 | 回调走集成中心，前端调用可走云 API 网关 |

两种模式的凭证配置完全相同（都需要私钥/公钥/证书序列号），区别仅在于回调地址和部署方式：
- **SDK 模式**：回调地址指向自己的服务（HTTP 访问服务域名，含完整路径）；回调路由不能开身份认证
- **网关模式**：回调地址指向集成中心，集成中心解密后转发明文到你的服务；无特殊部署约束

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

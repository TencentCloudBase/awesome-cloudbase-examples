# 小程序接入 - 云托管直连

> 基于 `examples/miniprogram-cloudrun/` Demo + cloudrun README 整理。
> 适用于将 pay-common 部署到 **CloudBase 云托管**的场景。

---

## 与云 API 版的核心区别

| 特性 | 云 API 版 (`miniprogram-cloud-api`) | 云托管版（本文） |
|------|:-------------------------------------:|:---------------:|
| **调用地址** | `/v1/functions/pay-common?webfn=true` | `/cloudrun/v1/pay/<action>` |
| **路由分发** | `body._action` 字段 | 标准 RESTful URL path |
| **响应格式** | 需解开 webfn 双层信封 | 直接 `{ code, msg, data }` |
| **性能** | 冷启动较慢 | 常驻容器，响应快 |
| **鉴权方式** | Bearer Token（云 API 网关验证） | Bearer Token（JWT 中间件验证） |

---

## 架构图

```
┌──────────────────┐   signInWithOpenId    ┌──────────────────┐
│  微信小程序        │ ──────────────────→  │  CloudBase Auth   │
│                  │ ← accessToken+openid │                   │
└──────────────────┘                       └──────────────────┘
       │
       │ Bearer Token（JWT 含 openid）
       ▼
┌──────────────────┐   POST /cloudrun/    ┌──────────────────┐
│  pay.js 封装层     │   v1/pay/<action>    │  云托管容器         │
│                  │ ← {code,msg,data}    │  (pay-common)     │
└──────────────────┘                        └──────────────────┘
                                                  │
                                             JWT 自动解析 openid
                                             调用微信支付 API
```

**调用特点**：
- 直连云托管容器，不经过云 API 网关
- 后端从 JWT Token 中**自动提取 openid**，前端无需传
- 响应是标准格式，无需解包

---

## 前置条件

| 条件 | 说明 |
|------|------|
| pay-common 已部署到云托管 | 见 [deploy-cloud-run.md](../部署/deploy-cloud-run.md) |
| 云托管访问域名 | 如 `https://xxx.ap-shanghai.app.tcloudbase.com` |
| CloudBase 身份认证 | 控制台已开启微信小程序身份源 |
| Publishable Key | 控制台 → 身份认证 → API Key 管理 |

---

## Step 1：安装依赖 & 配置

```bash
cd examples/miniprogram-cloudrun
npm install
```

编辑 `app.js`：

```javascript
const cloudbase = require('@cloudbase/js-sdk')

const ENV_ID = 'your-env-id'
const PUBLISHABLE_KEY = 'your-publishable-key'
const CLOUDRUN_BASE_URL = 'https://your-env-id-your-uin.ap-shanghai.app.tcloudbase.com'

App({
  globalData: {
    envId: ENV_ID,
    cloudRunBaseUrl: CLOUDRUN_BASE_URL,
    accessToken: '',
    openid: '',
    loginReady: false,
  },
  _cbApp: null,

  async onLaunch() {
    if (!this._cbApp) {
      const opts = { env: ENV_ID }
      if (PUBLISHABLE_KEY) opts.accessKey = PUBLISHABLE_KEY
      this._cbApp = cloudbase.init(opts)
    }

    const { data, error } = await this._cbApp.auth.signInWithOpenId()
    if (!error && data) {
      this.globalData.accessToken = data.session?.access_token || ''
      this.globalData.openid = data.user?.identities?.[0]?.identity_data?.provider_user_id || ''
    }
    this.globalData.loginReady = true
  },

  getAccessToken() { /* 同 cloud-api 版 */ },
  async reLogin() { /* 同 cloud-api 版 */ },
})
```

---

## Step 2：封装 API 调用（更简洁）

```javascript
// utils/pay.js
const app = getApp()

/**
 * 调用 pay-common 后端（云托管版）
 * @param {string} urlPath - 路由路径（如 '/cloudrun/v1/pay/wxpay_order'）
 * @param {object} data - 请求体
 */
function callCloudRun(urlPath, data) {
  return app.getAccessToken().then((accessToken) => {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.cloudRunBaseUrl}${urlPath}`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        data,
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)  // 直接返回，无需解包
          } else if (res.statusCode === 401) {
            app.reLogin().then(() => { /* 重试逻辑同 cloud-api 版 */ })
          } else {
            reject({ code: res.statusCode, msg: res.data?.msg || `HTTP ${res.statusCode}` })
          }
        },
        fail: reject,
      })
    })
  })
}

// 便捷方法映射
function callPayCommon(action, data) {
  return callCloudRun(`/cloudrun/v1/pay/${action}`, data)
}

module.exports = { callCloudRun, callPayCommon }
```

### 对比云 API 版的关键差异

| 差异点 | 云 API 版 | 云托管版 |
|--------|----------|---------|
| URL 拼接 | 固定的 `/v1/functions/pay-common?webfn=true` | 动态拼接 `/cloudrun/v1/pay/<action>` |
| 路由参数 | 用 `_action` 字段放在 body 里 | 放在 URL path 中 |
| 响应处理 | 需要解包 webfn 双层结构 | 直接使用 `res.data` |

---

## Step 3：下单并调起支付

```javascript
// pages/pay/index.js
const { callPayCommon } = require('../../utils/pay')
const app = getApp()

Page({
  async handlePay() {
    try {
      const res = await callPayCommon('wxpay_order', {
        description: '商品名称',
        out_trade_no: 'ORDER' + Date.now(),
        amount: { total: 100, currency: 'CNY' },
        // ⭐ 云托管模式下 openid 由后端从 JWT 提取，
        //   但这里仍然可以传（后端会以 JWT 中的为准）
        payer: { openid: app.globalData.openid },
      })

      if (res.code !== 0) {
        wx.showToast({ title: res.msg || '下单失败', icon: 'none' })
        return
      }

      const payData = res.data?.data || res.data
      await wx.requestPayment({
        timeStamp: String(payData.timeStamp),
        nonceStr: payData.nonceStr,
        package: payData.package || ('prepay_id=' + payData.prepay_id),
        signType: 'RSA',
        paySign: payData.paySign,
      })

      wx.showToast({ title: '支付成功', icon: 'success' })
    } catch (err) {
      if (err.errMsg?.includes('cancel')) return
      wx.showToast({ title: err.msg || '支付失败', icon: 'none' })
    }
  },
})
```

---

## JWT 自动鉴权模式

云托管版的优势之一是**后端自动从 JWT 提取 openid**：

```javascript
// 前端：只传业务参数，不需要传 openid（但传了也不会错）
callPayCommon('wxpay_order', {
  description: '测试商品',
  out_trade_no: 'ORDER' + Date.now(),
  amount: { total: 100, currency: 'CNY' },
  // 不传 payer.openid → 后端从 Authorization Bearer Token 中解析
})

// 如果不用 CloudBase Auth，也可以手动传 openid（兼容模式）
callPayCommon('wxpay_order', {
  description: '测试商品',
  out_trade_no: 'ORDER' + Date.now(),
  amount: { total: 100, currency: 'CNY' },
  payer: { openid: '手动传入的openid' }  // 兼容非 CloudBase Auth 场景
})
```

> **安全提醒**：手动传入的 openid 可能被篡改。生产环境强烈建议使用 JWT 自动鉴权。

---

## 可用的全部 API 路径

| 操作 | URL Path | 说明 |
|------|----------|------|
| JSAPI 下单 | `/cloudrun/v1/pay/wxpay_order` | 小程序/公众号支付 |
| H5 下单 | `/cloudrun/v1/pay/wxpay_order_h5` | 手机浏览器支付 |
| Native 下单 | `/cloudrun/v1/pay/wxpay_order_native` | PC 扫码支付 |
| APP 下单 | `/cloudrun/v1/pay/wxpay_order_app` | APP 支付 |
| 查单（商户号） | `/cloudrun/v1/pay/wxpay_query_order_by_out_trade_no` | 按 out_trade_no 查 |
| 查单（微信号） | `/cloudrun/v1/pay/wxpay_query_order_by_transaction_id` | 按 transaction_id 查 |
| 关闭订单 | `/cloudrun/v1/pay/wxpay_close_order` | 关闭未支付订单 |
| 退款 | `/cloudrun/v1/pay/wxpay_refund` | 申请退款 |
| 查退款 | `/cloudrun/v1/pay/wxpay_refund_query` | 查退款进度 |
| 转账 | `/cloudrun/v1/pay/wxpay_transfer` | 商家转账 |
| 查转账（商户号） | `/cloudrun/v1/pay/wxpay_transfer_bill_query` | 按商户单号查 |
| 查转账（微信号） | `/cloudrun/v1/pay/wxpay_transfer_bill_query_by_no` | 按微信单号查 |

---

## 部署检查清单

- [ ] 云托管服务已部署并正常运行
- [ ] 环境变量已在控制台配置完整
- [ ] CloudBase 身份认证已开启微信小程序身份源
- [ ] 小程序 AppID 与环境配置一致
- [ ] `request 合法域名`已配置（开发阶段可勾选「不校验」）
- [ ] 回调地址已正确配置（SDK 模式指向云托管域名）

---

*云 API 版见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md) | Web 测试页见 [web-h5.md](web-h5.md)*

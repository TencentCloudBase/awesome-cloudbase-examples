# 小程序接入 - 云托管直连

> 基于 `examples/miniprogram-cloudrun/` Demo + cloudrun README 整理。
> 适用于将 pay-common 部署到 **CloudBase 云托管**的场景。

---

## 与云 API 版的核心区别

| 特性 | 云 API 版 (`miniprogram-cloud-api`) | 云托管版（本文） |
|------|:-------------------------------------:|:---------------:|
| **调用地址** | `/v1/functions/pay-common?webfn=true` | `/wx-pay/<action>` |
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

> **Token 机制**：Access Token 有效期 2 小时，Refresh Token 有效期 30 天。SDK 内置方法会自动续期，但本方案使用 `wx.request` 手动调用，需自行处理过期（代码已实现 401 重试 + `reLogin()` 兜底）。
> 参考：[身份认证介绍](https://docs.cloudbase.net/authentication-v2/auth/introduce) | [登录态说明](https://docs.cloudbase.net/faq/knowledge/tcb-login-state-refresh-token)

---

## 前置条件

| 条件 | 说明 |
|------|------|
| pay-common 已部署到云托管 | 见 [deploy-cloud-run.md](../部署/deploy-cloud-run.md) |
| 云托管访问域名 | 如 `https://xxx.ap-shanghai.app.tcloudbase.com` |
| CloudBase 身份认证 | 控制台已开启微信小程序身份源 |

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
// 部署 pay-common 到云托管后，从控制台获取访问域名
const CLOUDRUN_BASE_URL = 'https://your-env-id-your-uin.ap-shanghai.app.tcloudbase.com'

App({
  globalData: {
    envId: ENV_ID,
    cloudRunBaseUrl: CLOUDRUN_BASE_URL,
    accessToken: '',
    openid: '',
    loginReady: false,
  },

  onLaunch() {
    if (ENV_ID === 'your-env-id') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中替换 ENV_ID 和 CLOUDRUN_BASE_URL',
        showCancel: false,
      })
      return
    }
    this.login()
  },

  async login() {
    try {
      const cbApp = cloudbase.init({ env: ENV_ID })
      const { data, error } = await cbApp.auth.signInWithOpenId()
      if (!error && data) {
        this.globalData.accessToken = data.session?.access_token || ''
        this.globalData.openid =
          data.user?.identities?.[0]?.identity_data?.provider_user_id || ''
      }
      this._notifyLoginReady()
    } catch (e) {
      console.error('登录失败:', e)
      this._notifyLoginReady()
    }
  },

  _notifyLoginReady() {
    this.globalData.loginReady = true
    if (this._loginCallbacks) {
      this._loginCallbacks.forEach(cb => cb())
      this._loginCallbacks = null
    }
  },

  waitForLogin() {
    if (this.globalData.loginReady) return Promise.resolve()
    if (!this._loginPromise) {
      this._loginPromise = new Promise((resolve) => {
        if (!this._loginCallbacks) this._loginCallbacks = []
        this._loginCallbacks.push(resolve)
      })
    }
    return this._loginPromise
  },

  async reLogin() {
    this.globalData.loginReady = false
    this._loginPromise = null
    await this.login()
  },
})
```

---

## Step 2：封装 API 调用（更简洁）

```javascript
// pages/pay/pay.js 顶部（也可抽到 utils/pay.js）
const app = getApp()

/**
 * 调用 pay-common 后端（云托管版）
 * 直连云托管域名，路径为 /wx-pay/<action>（标准 RESTful 路由）
 * 支持 401/403 自动重试
 *
 * @param {string} action - 路由动作名，如 'wxpay_order'
 * @param {object} data - 请求参数
 * @param {boolean} _isRetry - 内部参数，是否为重试请求
 */
function callCloudRun(action, data, _isRetry = false) {
  const { cloudRunBaseUrl, accessToken } = app.globalData

  if (!accessToken) {
    return Promise.reject({ code: -1, msg: 'accessToken 未获取，请等待登录完成' })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${cloudRunBaseUrl}/wx-pay/${action}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      data,  // 直接传业务参数，无需 _action 中间层
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)  // 直接返回，无需解包
        } else if ((res.statusCode === 401 || res.statusCode === 403) && !_isRetry) {
          // Token 过期，自动 reLogin 并重试一次
          console.warn('[鉴权] Token 可能过期，尝试重新登录...')
          app.reLogin().then(() => {
            callCloudRun(action, data, true).then(resolve).catch(reject)
          }).catch(() => {
            reject({ code: -1, msg: `鉴权失败 HTTP ${res.statusCode}`, data: res.data })
          })
        } else {
          reject({ code: res.statusCode, msg: res.data?.msg || `HTTP ${res.statusCode}` })
        }
      },
      fail: reject,
    })
  })
}
```

### 对比云 API 版的关键差异

| 差异点 | 云 API 版 | 云托管版 |
|--------|----------|---------|
| URL 拼接 | 固定的 `/v1/functions/pay-common?webfn=true` | 动态拼接 `/wx-pay/<action>` |
| 路由参数 | 用 `_action` 字段放在 body 里 | 放在 URL path 中 |
| 响应处理 | 需要解包 webfn 双层结构 | 直接使用 `res.data` |
| 401 重试 | 递归重试（`_isRetry` 防循环） | 同左，逻辑一致 |

---

## Step 3：下单并调起支付

```javascript
// pages/pay/index.js
const app = getApp()

Page({
  data: { openid: '' },

  async onLoad() {
    await app.waitForLogin()
    this.setData({ openid: app.globalData.openid })
  },

  async handlePay() {
    try {
      const res = await callCloudRun('wxpay_order', {
        description: '商品名称',
        out_trade_no: 'ORDER' + Date.now(),
        amount: { total: 100, currency: 'CNY' },
        // ⭐ 云托管模式下 openid 由后端从 JWT 提取，
        //   但这里仍然可以传（后端会以 JWT 中的为准）
        payer: { openid: this.data.openid },
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
callCloudRun('wxpay_order', {
  description: '测试商品',
  out_trade_no: 'ORDER' + Date.now(),
  amount: { total: 100, currency: 'CNY' },
  // 不传 payer.openid → 后端从 Authorization Bearer Token 中解析
})

// 如果不用 CloudBase Auth，也可以手动传 openid（兼容模式）
callCloudRun('wxpay_order', {
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
| JSAPI 下单 | `/wx-pay/wxpay_order` | 小程序/公众号支付 |
| H5 下单 | `/wx-pay/wxpay_order_h5` | 手机浏览器支付 |
| Native 下单 | `/wx-pay/wxpay_order_native` | PC 扫码支付 |
| APP 下单 | `/wx-pay/wxpay_order_app` | APP 支付 |
| 查单（商户号） | `/wx-pay/wxpay_query_order_by_out_trade_no` | 按 out_trade_no 查 |
| 查单（微信号） | `/wx-pay/wxpay_query_order_by_transaction_id` | 按 transaction_id 查 |
| 关闭订单 | `/wx-pay/wxpay_close_order` | 关闭未支付订单 |
| 退款 | `/wx-pay/wxpay_refund` | 申请退款 |
| 查退款 | `/wx-pay/wxpay_refund_query` | 查退款进度 |
| 转账 | `/wx-pay/wxpay_transfer` | 商家转账 |
| 查转账（商户号） | `/wx-pay/wxpay_transfer_bill_query` | 按商户单号查 |
| 查转账（微信号） | `/wx-pay/wxpay_transfer_bill_query_by_no` | 按微信单号查 |

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

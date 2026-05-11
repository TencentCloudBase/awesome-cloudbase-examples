# 小程序接入 - 云 API 网关（推荐）

> 基于 `examples/miniprogram/` Demo + `pay-common/README.md` Step 5 整理。
> **推荐方式**：通过 CloudBase 云 API 网关调用 HTTP 云函数。

---

## 架构图

```
┌──────────────────┐   signInWithOpenId    ┌──────────────────┐
│  微信小程序        │ ──────────────────→  │  CloudBase Auth   │
│                  │ ← accessToken+openid │  (身份认证)        │
└──────────────────┘                       └──────────────────┘
       │                                            │
       │ Bearer Token                               │ 自动解码 JWT
       ▼                                            ▼
┌──────────────────┐   POST /v1/functions/   ┌──────────────────┐
│  pay.js 封装层     │   pay-common?webfn=true │  HTTP 云函数       │
│                  │ ←── {code,msg,data} ──│  (pay-common)      │
└──────────────────┘                        └──────────────────┘
```

**调用特点**：
- 通过 CloudBase **云 API 网关**转发到 HTTP 云函数
- 路由分发用 `body._action` 字段
- 响应需要解包双层结构（webfn 信封）

---

## 前置条件

| 条件 | 说明 |
|------|------|
| CloudBase 环境 | 已开通，记录 ENV_ID |
| 小程序身份源 | 控制台 → 身份认证 → 开启微信小程序身份源 |
| pay-common 已部署 | 部署为 HTTP 云函数（见 [deploy-cloud-function.md](../部署/deploy-cloud-function.md)）|
| 微信开发者工具 | 最新稳定版 |

---

## Step 1：安装依赖

```bash
cd examples/miniprogram
npm install
```

依赖说明：

```json
{
  "dependencies": {
    "@cloudbase/js-sdk": "^3.0.0"  // CloudBase 客户端 SDK
  }
}
```

---

## Step 2：配置 app.js

```javascript
// app.js - 入口文件
const cloudbase = require('@cloudbase/js-sdk')

const ENV_ID = 'your-env-id'           // ⚠️ 替换为你的云开发环境 ID
const FUNCTION_NAME = 'pay-common'     // HTTP 云函数名称（如部署时改了名字，这里同步改）
const API_GATEWAY = `https://${ENV_ID}.api.tcloudbasegateway.com`

App({
  globalData: {
    envId: ENV_ID,
    functionName: FUNCTION_NAME,
    apiGateway: API_GATEWAY,
    accessToken: '',
    openid: '',
    loginReady: false,
  },

  onLaunch() {
    // 启动时检查环境配置
    if (ENV_ID === 'your-env-id') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中将 ENV_ID 替换为你的云开发环境 ID',
        showCancel: false,
      })
      return
    }
    this.login()
  },

  /**
   * 静默登录流程（用户无感知）：
   * 1. @cloudbase/js-sdk signInWithOpenId() 一步完成登录
   * 2. 自动获取 openid + accessToken
   */
  async login() {
    try {
      const cbApp = cloudbase.init({ env: ENV_ID })
      const { data, error } = await cbApp.auth.signInWithOpenId()

      if (error) {
        console.error('[登录失败]', error.code, error.message)
        this._notifyLoginReady()
        return
      }

      if (data.session?.access_token) {
        this.globalData.accessToken = data.session.access_token
      }
      if (data.user) {
        this.globalData.openid =
          data.user.identities?.[0]?.identity_data?.provider_user_id || ''
      }

      this._notifyLoginReady()
    } catch (e) {
      console.error('CloudBase 登录失败:', e)
      this._notifyLoginReady()
    }
  },

  /**
   * 通知所有等待登录的调用方（支持多页面并发调用）
   */
  _notifyLoginReady() {
    this.globalData.loginReady = true
    if (this._loginCallbacks) {
      this._loginCallbacks.forEach(cb => cb())
      this._loginCallbacks = null
    }
  },

  /**
   * 等待登录完成（页面 onLoad 中调用）
   * 比轮询更健壮：登录完成时会立即回调，不会死循环
   */
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

  /**
   * 手动重新登录（Token 过期兜底）
   * 注意：SDK 内置方法（如 callFunction）会自动刷新 Token，但本方案使用
   * wx.request 手动调用 API 网关，SDK 无法自动介入刷新。
   * 当 401 重试仍失败（Refresh Token 也过期，30 天未活跃）时触发完整重登录。
   */
  async reLogin() {
    this.globalData.loginReady = false
    this._loginPromise = null
    await this.login()
  },
})
```

### 关键点

| 要点 | 说明 |
|------|------|
| `signInWithOpenId()` | 必须使用此方法获取 openid，不能用 `wx.login()` 的 code 换取 |
| `waitForLogin()` | 页面中使用回调通知机制等待登录完成，避免轮询死循环 |
| 登录时机 | 在 `onLaunch` 中执行，确保支付前已完成 |
| Token 有效期 | Access Token 有效期 **2 小时**，Refresh Token 有效期 **30 天** |
| Token 过期处理 | SDK 内置方法（如 `callFunction`）会自动刷新 Token；但本方案使用 `wx.request` 手动调 API 网关，需自行处理过期——代码已通过 **401 检测 + `reLogin()` 重试**实现 |

> **参考文档**：
> - [CloudBase 身份认证介绍](https://docs.cloudbase.net/authentication-v2/auth/introduce)
> - [登录态 Refresh Token 说明](https://docs.cloudbase.net/faq/knowledge/tcb-login-state-refresh-token)

---

## Step 3：封装 API 调用

```javascript
// pages/pay/pay.js（也可抽到 utils/pay.js 中）
const app = getApp()

/**
 * 调用 pay-common 后端（云函数版）
 * 云 API 网关会将路径截断为 /，所以通过 body._action 传递实际路由
 * 支持 401/403 自动重试：token 过期时自动 reLogin 后重试一次
 *
 * @param {string} action - 路由动作名，如 'wxpay_order'
 * @param {object} data - 请求参数
 * @param {boolean} _isRetry - 内部参数，是否为重试请求
 */
function callPayCommon(action, data, _isRetry = false) {
  const { apiGateway, functionName, accessToken } = app.globalData

  if (!accessToken) {
    return Promise.reject({ code: -1, msg: 'accessToken 未获取，请等待登录完成' })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiGateway}/v1/functions/${functionName}?webfn=true`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      // 把 action 放进 body，Express 根据 _action 分发路由
      data: { _action: action, ...data },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 云 API 调用 HTTP 云函数（webfn=true）时，返回结构为：
          //   { code, msg, data: { status: 200, data: <云函数真正返回> } }
          // 这里把内层的 HTTP 信封解开：
          let payload = res.data
          const inner = payload && payload.data
          if (inner && typeof inner === 'object'
              && Object.prototype.hasOwnProperty.call(inner, 'status')
              && Object.prototype.hasOwnProperty.call(inner, 'data')) {
            payload = { ...payload, data: inner.data }
          }
          resolve(payload)
        } else if ((res.statusCode === 401 || res.statusCode === 403) && !_isRetry) {
          // Token 过期，自动 reLogin 并重试一次
          console.warn('[鉴权] Token 可能过期，尝试重新登录...')
          app.reLogin().then(() => {
            callPayCommon(action, data, true).then(resolve).catch(reject)
          }).catch(() => {
            reject({ code: -1, msg: `鉴权失败 HTTP ${res.statusCode}`, data: res.data })
          })
        } else {
          reject({ code: -1, msg: `HTTP ${res.statusCode}`, data: res.data })
        }
      },
      fail(err) {
        reject(err)
      },
    })
  })
}
```

### 关键点

| 要点 | 说明 |
|------|------|
| `_action` 字段 | 用于路由分发，对应后端路由名 |
| `apiGateway` / `functionName` | 从 `app.globalData` 获取，统一在 app.js 配置 |
| webfn 解包 | 云函数网关返回双层结构 `{ data: { status, data } }`，需提取内层数据 |
| 401/403 重试 | Token 过期时自动 `reLogin` 后递归重试一次（`_isRetry` 防无限循环） |
| Bearer Token | 放在 Authorization 头中 |

---

## Step 4：下单并调起支付

```javascript
// pages/pay/index.js
const app = getApp()

Page({
  data: { loading: false, openid: '' },

  async onLoad() {
    // 等待 app.js 登录完成（回调通知机制，不会死循环）
    await app.waitForLogin()
    this.setData({ openid: app.globalData.openid })
  },

  // 下单 + 调起支付（完整流程）
  async handlePay() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      // 1️⃣ 下单
      const res = await callPayCommon('wxpay_order', {
        description: '商品名称',                          // 商品描述
        out_trade_no: 'ORDER' + Date.now(),               // 全局唯一订单号 ⚠️
        amount: { total: 100, currency: 'CNY' },          // 金额单位=分！⚠️
        payer: { openid: this.data.openid },              // 从登录获取的 openid
      })

      if (res.code !== 0) {
        wx.showToast({ title: res.msg || '下单失败', icon: 'none' })
        return
      }

      // 2️⃣ 提取调起支付参数
      const payData = res.data?.data || res.data

      // 3️⃣ 调起微信支付
      await wx.requestPayment({
        timeStamp: String(payData.timeStamp),             // 时间戳（字符串）
        nonceStr: payData.nonceStr,                        // 随机字符串
        package: payData.package || ('prepay_id=' + payData.prepay_id),  // 预支付标识
        signType: 'RSA',                                   // 签名类型
        paySign: payData.paySign,                           // 签名串
      })

      // 4️⃣ 支付成功提示
      wx.showToast({ title: '支付成功', icon: 'success' })

      // ⚠️ 建议：支付成功后主动查单确认状态，不要仅依赖前端回调

    } catch (err) {
      console.error('支付失败:', err)
      if (err.errMsg && err.errMsg.includes('cancel')) {
        console.log('用户取消支付')
      } else {
        wx.showToast({ title: err.msg || '支付失败', icon: 'none' })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 查询订单
  async queryOrder(outTradeNo) {
    const res = await callPayCommon('wxpay_query_order_by_out_trade_no', {
      out_trade_no: outTradeNo,
    })
    console.log('订单状态:', res.data)
    return res
  },
})
```

---

## Step 5：其他操作示例

```javascript
// 关闭订单
await callPayCommon('wxpay_close_order', {
  out_trade_no: 'ORDER_xxx'
})

// 申请退款（需谨慎！）
await callPayCommon('wxpay_refund', {
  out_trade_no: 'ORDER_xxx',
  out_refund_no: 'REFUND' + Date.now(),   // ⚠️ 退款单号也必须唯一
  total: 100,                              // 原订单金额（分）
  refund: 100,                             // 退款金额（分）
  reason: '用户申请退款'
})

// 商家转账
await callPayCommon('wxpay_transfer', {
  out_bill_no: 'BILL' + Date.now(),
  transfer_amount: 100,                    // 单位：分
  openid: app.globalData.openid           // 收款人 openid
})
// 返回数据中的 mchId 需传给 wx.requestMerchantTransfer 使用
```

---

## 完整调用链路总结

```
用户点击"支付"
  ↓
1. 检查登录状态（accessToken / openid）→ 未登录则等待登录完成
  ↓
2. 调用 callPayCommon('wxpay_order', {...}) → POST 到云 API 网关
  ↓
3. 后端签名下单 → 返回 prepay_id + 签名参数
  ↓
4. wx.requestPayment({timeStamp, nonceStr, package, signType, paySign})
  ↓
5. 用户在微信界面完成支付
  ↓
6a. 成功 → showToast + 可选主动查单确认
6b. 取消 → 提示用户
6c. 失败 → 报错
```

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | 登录失败 | ENV_ID 未替换或小程序身份源未开启 | 检查 app.js 配置；确认控制台已开启小程序身份源 |
| 2 | openid 为空 | 未使用 `signInWithOpenId()` | 必须用此方法，不能用 wx.login 的 code |
| 3 | `requestPayment` 签名错误 | 下单与调起用了不同私钥 | 确保同一套凭证 |
| 4 | 401 Unauthorized | Token 过期或无效 | pay.js 中已有自动重试逻辑 |
| 5 | `request 合法域名未配置` | wx.request 被拦截 | 小程序后台→开发设置→服务器域名→添加 `tcloudbasegateway.com` |
| 6 | 下单返回 `-1` | 参数错误（如金额非整数） | 检查 amount.total 是否为正整数（分） |

---

## 安全注意事项

> 详见 [security-checklist.md](../业务开发/security-checklist.md)。

1. **openid 不可信**：虽然本方案从服务端 JWT 获取 openid，但不要信任任何从前端传入的 openid
2. **金额必须来自后端**：示例中金额写在前端仅供测试，生产环境必须从业务系统查询
3. **订单号全局唯一**：建议用 `前缀 + 时间戳 + 随机数` 格式

---

*小程序云托管版见 [miniprogram-cloud-run.md](miniprogram-cloud-run.md) | H5 见 [web-h5.md](web-h5.md)*

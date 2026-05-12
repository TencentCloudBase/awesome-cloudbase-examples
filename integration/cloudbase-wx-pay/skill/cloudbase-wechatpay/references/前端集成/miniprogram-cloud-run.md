# 小程序接入 - 云托管（callContainer）

> 基于 `examples/miniprogram-cloudrun/` Demo 整理。
> 适用于将 pay-common 部署到 **CloudBase 云托管**的场景。

---

## 与云函数版的核心区别

| 特性 | 云函数版 (`miniprogram/`) | 云托管版（本文） |
|------|:-------------------------------------:|:---------------:|
| **调用方式** | `wx.cloud.callHTTPFunction` | `wx.cloud.callContainer` |
| **路由分发** | Express 标准路径 `path: '/wx-pay/<action>'` | Express 标准路径 `path: '/wx-pay/<action>'` |
| **响应格式** | 直接 `{ code, msg, data }` | 直接 `{ code, msg, data }` |
| **身份认证** | 平台自动注入 `x-wx-openid` | 平台自动注入 `x-wx-openid` |
| **性能** | 冷启动较慢 | 常驻容器，响应快 |
| **鉴权方式** | 平台自动处理 | 平台自动处理 |

---

## 架构图

```
┌──────────────────┐                          ┌──────────────────┐
│  微信小程序        │   wx.cloud.callContainer  │  云托管容器       │
│  (本模板)         │  ──── POST /wx-pay/* ───→ │  (pay-common)    │
│                  │  ←─── { code, msg, data } │                  │
│  app.js          │                          │  读取 x-wx-openid │
│  └ wx.cloud.init │    平台自动注入 header:     │  调用微信支付 API  │
│                  │    x-wx-openid            │                  │
│  pay.js          │    x-wx-source            │                  │
│  └ callContainer │    x-wx-appid             │                  │
└──────────────────┘                          └──────────────────┘
```

**调用特点**：
- 通过 `wx.cloud.callContainer` 直接调用云托管容器
- 平台自动注入 `x-wx-openid` header，**无需登录、无需 Token**
- 响应是标准格式，无需解包
- 通过 `X-WX-SERVICE` header 指定目标服务

---

## 前置条件

| 条件 | 说明 |
|------|------|
| pay-common 已部署到云托管 | 见 [deploy-cloud-run.md](../部署/deploy-cloud-run.md) |
| 基础库版本 ≥ 3.15.2 | `project.config.json` 中已设为 3.15.2 |

> 💡 **无需额外配置**：callContainer 不需要 CloudBase Auth 身份源、不需要配置服务器域名白名单、不需要 npm 依赖。

---

## Step 1：配置 app.js

```javascript
// app.js - 入口文件（极简配置）
const ENV_ID = 'YOUR_ENV_ID'           // ⚠️ 替换为你的云开发环境 ID
const SERVICE_NAME = 'pay-common'     // 云托管服务名称

App({
  globalData: {
    envId: ENV_ID,
    serviceName: SERVICE_NAME,
  },

  onLaunch() {
    if (ENV_ID === 'YOUR_ENV_ID') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中将 ENV_ID 替换为你的云开发环境 ID',
        showCancel: false,
      })
      return
    }

    // 初始化微信云开发（callContainer 需要先 init）
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })

    console.log('[App] 云开发初始化完成, env:', ENV_ID)
  },
})
```

### 关键点

| 要点 | 说明 |
|------|------|
| `wx.cloud.init()` | 必须在调用 `callContainer` 前执行 |
| 无需登录 | 不需要 `@cloudbase/js-sdk`、不需要 `signInWithOpenId()`、不需要 Token |
| 无 npm 依赖 | 项目无 `package.json`，无需安装或构建 |

---

## Step 2：封装 API 调用

```javascript
// pages/pay/pay.js 顶部（也可抽到 utils/pay.js）
const app = getApp()

/**
 * 通过 wx.cloud.callContainer 调用 pay-common 后端（云托管版）
 *
 * 使用 callContainer 的优势（相比 wx.request + Bearer token）：
 * - 无需 CloudBase Auth 登录，无需 accessToken / Bearer 鉴权
 * - 平台自动注入 x-wx-openid header，后端可直接获取用户身份
 * - 无需手动登录流程，开箱即用
 * - 无需配置服务器域名白名单（走 SDK 内部通道）
 *
 * @param {string} action - 路由路径名，如 'wxpay_order'
 * @param {object} data - 请求参数
 */
function callCloudRun(action, data) {
  const { envId, serviceName } = app.globalData

  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: {
        env: envId,
      },
      path: `/wx-pay/${action}`,
      method: 'POST',
      header: {
        'X-WX-SERVICE': serviceName,
        'Content-Type': 'application/json',
      },
      data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)  // 直接返回，无需解包
        } else {
          console.error('callContainer 请求失败:', res.statusCode, res.data)
          reject({ code: -1, msg: `HTTP ${res.statusCode}`, data: res.data })
        }
      },
      fail(err) {
        console.error('callContainer 网络请求失败:', err)
        reject(err)
      },
    })
  })
}
```

### 关键点

| 要点 | 说明 |
|------|------|
| `X-WX-SERVICE` | 指定目标云托管服务名称 |
| `path` 参数 | 直接映射到 Express 路由，如 `/wx-pay/wxpay_order` |
| 无需解包 | 响应直接是 `{ code, msg, data }`，无需处理双层结构 |
| 无需鉴权处理 | 不需要 Token、不需要 401 重试、不需要 reLogin 逻辑 |

---

## Step 3：下单并调起支付

```javascript
// pages/pay/pay.js
const app = getApp()

Page({
  data: { loading: false },

  async handlePay() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const res = await callCloudRun('wxpay_order', {
        description: '商品名称',
        out_trade_no: 'ORDER' + Date.now(),
        amount: { total: 100, currency: 'CNY' },
        // ❌ 不需要传 payer.openid，后端自动从 x-wx-openid header 获取
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
    } finally {
      this.setData({ loading: false })
    }
  },
})
```

---

## callContainer 自动鉴权

callContainer 模式下，微信平台自动注入 `x-wx-openid` header：

```javascript
// 前端：只传业务参数，不需要传 openid
callCloudRun('wxpay_order', {
  description: '测试商品',
  out_trade_no: 'ORDER' + Date.now(),
  amount: { total: 100, currency: 'CNY' },
  // 不传 payer.openid → 后端从 x-wx-openid header 自动获取
})
```

```javascript
// 后端 —— 直接读取可信 header
const openid = req.headers['x-wx-openid']
```

> ✅ `x-wx-openid` 由平台注入、客户端无法伪造，比手动传入 openid 更安全。

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
- [ ] 小程序 AppID 与环境配置一致
- [ ] 回调地址已正确配置

---

*云函数版见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md) | Web 测试页见 [web-h5.md](web-h5.md)*

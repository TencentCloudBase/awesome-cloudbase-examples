# 小程序接入 - HTTP 云函数（callHTTPFunction）

> 基于 `examples/miniprogram/` Demo 整理。
> **推荐方式**：通过 `wx.cloud.callHTTPFunction` 调用 HTTP 云函数，平台自动注入 openid，无需登录流程。

---

## 架构图

```
┌──────────────────┐                              ┌──────────────────┐
│  微信小程序        │  wx.cloud.callHTTPFunction    │  HTTP 云函数       │
│                  │  ──── POST /wx-pay/* ──────→ │  (pay-common)      │
│  app.js          │  ←─── { code, msg, data } ──│                    │
│  └ wx.cloud.init │                              │  读取 x-wx-openid  │
│                  │    平台自动注入 header:         │  调用微信支付 API   │
│  pay.js          │    x-wx-openid               │                    │
│  └ callHTTPFunc  │    x-wx-source               │                    │
│                  │    x-wx-appid                │                    │
└──────────────────┘                              └──────────────────┘
```

**调用特点**：
- 通过 `wx.cloud.callHTTPFunction` 直接调用 HTTP 云函数
- 路由通过 `path` 参数走 Express 标准路由（如 `/wx-pay/wxpay_order`）
- 平台自动注入 `x-wx-openid` header，无需登录、无需 Token
- 响应直接返回 `{ code, msg, data }`，无需解包

---

## 前置条件

| 条件 | 说明 |
|------|------|
| CloudBase 环境 | 已开通，记录 ENV_ID |
| pay-common 已部署 | 部署为 HTTP 云函数（见 [deploy-cloud-function.md](../部署/deploy-cloud-function.md)）|
| 基础库版本 ≥ 3.15.2 | `project.config.json` 中 `libVersion` 设为 3.15.2 或更高 |
| 微信开发者工具 | 最新稳定版 |

> 💡 **无需额外配置**：callHTTPFunction 不需要开启 CloudBase Auth 身份源、不需要安装 npm 依赖、不需要构建 npm。

---

## Step 1：配置 app.js

```javascript
// app.js - 入口文件（极简配置）
const ENV_ID = 'YOUR_ENV_ID'           // ⚠️ 替换为你的云开发环境 ID
const FUNCTION_NAME = 'pay-common'     // HTTP 云函数名称（如部署时改了名字，这里同步改）

App({
  globalData: {
    envId: ENV_ID,
    functionName: FUNCTION_NAME,
  },

  onLaunch() {
    // 启动时检查环境配置
    if (ENV_ID === 'YOUR_ENV_ID') {
      wx.showModal({
        title: '配置未完成',
        content: '请先在 app.js 中将 ENV_ID 替换为你的云开发环境 ID',
        showCancel: false,
      })
      return
    }

    // 初始化微信云开发（callHTTPFunction 需要先 init）
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
| `wx.cloud.init()` | 必须在调用 `callHTTPFunction` 前执行 |
| 无需登录 | 不需要 `@cloudbase/js-sdk`、不需要 `signInWithOpenId()`、不需要 Token 管理 |
| 无 npm 依赖 | 项目无 `package.json`，无需 `npm install`、无需构建 npm |
| 配置集中 | 只需修改顶部的 `ENV_ID` 和 `FUNCTION_NAME` |

---

## Step 2：封装 API 调用

```javascript
// pages/pay/pay.js 顶部（也可抽到 utils/pay.js 中）
const app = getApp()

/**
 * 通过 wx.cloud.callHTTPFunction 调用 pay-common 后端
 *
 * 使用 callHTTPFunction 的优势：
 * - 无需 accessToken / Bearer 鉴权，平台自动鉴权
 * - 平台自动注入 x-wx-openid header，后端可直接获取用户身份
 * - 无需手动登录流程，开箱即用
 *
 * @param {string} action - 路由路径名，如 'wxpay_order'
 * @param {object} data - 请求参数
 */
function callPayCommon(action, data) {
  const { functionName, envId } = app.globalData

  return new Promise((resolve, reject) => {
    wx.cloud.callHTTPFunction({
      name: functionName,
      config: {
        env: envId,
      },
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      // 直接走 Express 路由，path 与后端 app.use('/wx-pay', payRouter) 对应
      path: `/wx-pay/${action}`,
      data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // callHTTPFunction 返回的 res.data 直接是云函数的 HTTP 响应体
          // pay-common 返回格式为 { code, msg, data }，无需额外解包
          resolve(res.data)
        } else {
          console.error('HTTP 请求失败:', res.statusCode, res.data)
          reject({ code: -1, msg: `HTTP ${res.statusCode}`, data: res.data })
        }
      },
      fail(err) {
        console.error('网络请求失败:', err)
        reject(err)
      },
    })
  })
}
```

### 关键点

| 要点 | 说明 |
|------|------|
| `path` 参数 | 直接映射到 Express 路由，如 `/wx-pay/wxpay_order` |
| `name` / `config.env` | 从 `app.globalData` 获取，统一在 app.js 配置 |
| 无需解包 | 响应直接是 `{ code, msg, data }`，无需处理 webfn 双层信封 |
| 无需鉴权处理 | 不需要 Token、不需要 401 重试、不需要 reLogin 逻辑 |
| openid 自动注入 | 平台在 header 中注入 `x-wx-openid`，后端直接读取 |

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
      // 1️⃣ 下单（openid 由平台自动注入，无需传入）
      const res = await callPayCommon('wxpay_order', {
        description: '商品名称',                          // 商品描述
        out_trade_no: 'ORDER' + Date.now(),               // 全局唯一订单号 ⚠️
        amount: { total: 100, currency: 'CNY' },          // 金额单位=分！⚠️
        // ❌ 不需要传 payer.openid，后端自动从 x-wx-openid header 获取
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

## Step 4：其他操作示例

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

// 商家转账（openid 由后端自动从 x-wx-openid 获取）
await callPayCommon('wxpay_transfer', {
  out_bill_no: 'BILL' + Date.now(),
  transfer_amount: 100,                    // 单位：分
  // ❌ 不需要传 openid，后端从 x-wx-openid header 自动获取
})
// 返回数据中的 mchId + package_info 用于 wx.requestMerchantTransfer
```

---

## 完整调用链路总结

```
用户点击"支付"
  ↓
1. wx.cloud.callHTTPFunction({ name, path, data })
  ↓
2. 平台自动注入 x-wx-openid header
  ↓
3. HTTP 云函数收到请求，从 header 获取 openid
  ↓
4. 后端签名下单 → 返回 prepay_id + 签名参数
  ↓
5. wx.requestPayment({timeStamp, nonceStr, package, signType, paySign})
  ↓
6. 用户在微信界面完成支付
  ↓
7a. 成功 → showToast + 可选主动查单确认
7b. 取消 → 提示用户
7c. 失败 → 报错
```

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | `callHTTPFunction is not a function` | 基础库版本过低 | `project.config.json` 中 `libVersion` 设为 `3.15.2` 或更高 |
| 2 | openid 为空 | 真机未登录微信 / 开发者工具未设置 openid | 真机调试，或在开发者工具设置模拟 openid |
| 3 | `requestPayment` 签名错误 | 下单与调起用了不同私钥 | 确保同一套凭证 |
| 4 | 调用返回 404 | 函数名或路径错误 | 检查 `name` 和 `path` 参数是否正确 |
| 5 | 下单返回 `-1` | 参数错误（如金额非整数） | 检查 amount.total 是否为正整数（分） |

---

## 安全注意事项

> 详见 [security-checklist.md](../业务开发/security-checklist.md)。

1. **openid 安全可信**：callHTTPFunction 模式下，`x-wx-openid` 由平台注入、客户端无法伪造，比旧方案更安全
2. **金额必须来自后端**：示例中金额写在前端仅供测试，生产环境必须从业务系统查询
3. **订单号全局唯一**：建议用 `前缀 + 时间戳 + 随机数` 格式

---

## 使用官方示例工程

> 适合不想自行搭脚手架、想快速跑通完整链路的场景。

官方仓库提供完整的小程序示例：[awesome-cloudbase-examples/integration/cloudbase-wx-pay/examples/miniprogram](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/integration/cloudbase-wx-pay/examples/miniprogram)

### 一次性配置

1. **导入工程**：微信开发者工具 → 右上角「导入项目」→ 选择 `examples/miniprogram/` 目录
2. **填写关键参数**（⚠️ 缺一不可，否则调用 404）：
   - `app.js` 顶部 `ENV_ID` → 实际云开发环境 ID
   - `app.js` 顶部 `FUNCTION_NAME` → **必须改为集成创建后生成的真实函数名**（在控制台 → 集成中心 → 对应集成详情页中查看，形如 `miniapp-wxpay-rwmx67sc`，而非默认的 `pay-common`）
   - `project.config.json` 中的 `appid` → 实际小程序 AppID
   - `project.config.json` 中的 `libVersion` → 确认 ≥ `3.15.2`

> 💡 示例工程使用 `wx.cloud.callHTTPFunction`，**无需** `npm install`、无需构建 npm、无需安装任何依赖。

### 模拟器自检

点击左上角「编译」。Console 中能看到云开发初始化成功即说明配置正常。

模拟器可用于验证：
- 云开发初始化是否成功
- 下单是否返回 `prepay_id`
- 页面交互是否正常

**但模拟器无法完成真实支付**——`callHTTPFunction` 在模拟器中注入的 openid 可能为测试值，下单会被微信拒绝；即便绕过该限制，`wx.requestPayment` 也需要在手机微信中输入支付密码，模拟器不具备此能力。

### 真机支付测试

1. 右上角「真机调试」→ 手机微信扫码打开
2. 在手机端点击「微信支付」按钮 → 微信弹出密码界面 → 输入密码完成支付

---

*小程序云托管版见 [miniprogram-cloud-run.md](miniprogram-cloud-run.md) | H5 见 [web-h5.md](web-h5.md)*

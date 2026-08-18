# 微搭低码（WeDa）小程序接入微信支付

> 适合零开发、用低码搭建支付页面的场景。
> 使用 `wx.cloud.callHTTPFunction` 调用后端，平台自动注入 openid，无需登录流程、无需 Token 管理。

---

## 架构图

```
┌──────────────────┐                              ┌──────────────────┐
│  微搭低码页面      │  wx.cloud.callHTTPFunction    │  HTTP 云函数       │
│                  │  ──── POST /wx-pay/* ──────→ │  (pay-common)      │
│  页面方法         │  ←─── { code, msg, data } ──│                    │
└──────────────────┘                              └──────────────────┘
       │                                                   │
       │ 平台自动注入 x-wx-openid                           │ 从 header 取 openid
       │ 无需 Token / 无需登录                              │
       ▼                                                   ▼
┌──────────────────┐                              ┌──────────────────┐
│  wx.requestPayment│                              │  微信支付 API      │
│  调起支付弹窗     │                               │                   │
└──────────────────┘                              └──────────────────┘
```

**与原生小程序的区别**：

| 维度 | 原生小程序 | 微搭低码 |
|------|-----------|---------|
| 调用方式 | `wx.cloud.callHTTPFunction`（在 `app.js` 中 init） | `wx.cloud.callHTTPFunction`（在页面方法中直接调用） |
| 获取 openid | 平台自动注入 `x-wx-openid` | 平台自动注入 `x-wx-openid`（无需 `$w.auth`） |
| Token 管理 | 无需（平台自动鉴权） | 无需（平台自动鉴权） |
| 代码位置 | app.js + 页面文件 | 微搭页面 → 方法 → 自定义方法 |

---

## 前置条件

| 条件 | 说明 |
|------|------|
| 微搭应用 | 已创建并关联 CloudBase 环境 |
| pay-common 已部署 | 集成中心已创建微信支付集成（自动生成 HTTP 云函数） |
| 云开发环境 | 微搭应用绑定的 CloudBase 环境已初始化 |
| 基础库版本 | 微搭构建的小程序基础库 ≥ 3.15.2（支持 `callHTTPFunction`） |

---

## 关键约束

1. **使用 `wx.cloud.callHTTPFunction` 调用**——平台自动注入 `x-wx-openid`，后端直接从 header 获取，无需前端传 openid
2. **`name` 参数使用集成创建后的真实函数名**——形如 `pay-050603-mdd8hhn8-demo-scfweb`
3. **`path` 参数走 Express 标准路由**——如 `/wx-pay/wxpay_order`
4. **不需要 `$w.auth`、不需要 accessToken、不需要 Bearer 鉴权**——`callHTTPFunction` 已自动处理身份
5. **不需要传 `payer.openid`**——后端从 `x-wx-openid` header 自动获取

---

## 完整代码示例

将以下代码粘贴到微搭页面 → 方法 → 自定义方法：

```javascript
/**
 *
 * 可通过 $page 获取或修改当前页面的 变量 状态 handler lifecycle 等信息
 * 可通过 app 获取或修改全局应用的 变量 状态 等信息
 * 具体可以console.info 在编辑器Console面板查看更多信息
 * 注意：该方法仅在所属的页面有效
 * 如果需要 async-await，请修改成 export default async function() {}
 * 帮助文档 https://cloud.tencent.com/document/product/1301/57912
 **/

/**
 * @param {Object} event - 事件对象
 * @param {string} event.type - 事件名
 * @param {any} event.detail - 事件携带自定义数据
 *
 * @param {Object} data
 * @param {any} data.target - 获取事件传参的数据
 **/
export default async function({event, data}) {
// ============ 页面：发起一次完整支付 ============

  const out_trade_no = 'ORDER_' + Date.now()

  // 1. 调用云函数下单（云 API 网关返回双层结构，需解包内层 data）

  const orderRes = await new Promise((resolve, reject) => {
      wx.cloud.callHTTPFunction({
      name: 'pay-050603-mdd8hhn8-demo-scfweb',   // ⚠️ 替换：集成创建后生成的实际函数名
      config: {
        env: 'test-wxpay-5gy4ugzreef15cfe',       // ⚠️ 替换：云开发环境 ID
      },
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      path: `/wx-pay/wxpay_order`,
      data: {
        description: '测试商品',
        out_trade_no,
        amount: { total: 20, currency: 'CNY' },   // 0.2 元
      },
      success: resolve,
      fail: reject,
    })
  })

  const body = orderRes.data
  if (body.code !== 0) {
    wx.showToast({ title: body.msg || '下单失败', icon: 'error' })
    return
  }
  // 解包：{ code, data: { status, data: <业务数据> } } → 取最内层
  const p = body.data && body.data.data ? body.data.data : body.data
  // p = { timeStamp, nonceStr, package, signType, paySign }

  // 2. 调起微信支付
  wx.requestPayment({
    timeStamp: p.timeStamp,
    nonceStr: p.nonceStr,
    package: p.package,                  // 形如 'prepay_id=wx20...'
    signType: p.signType || 'RSA',
    paySign: p.paySign,
    success() {
      // 支付成功：前端仅用于更新 UI，最终以服务端回调为准
      // 建议 1-2 秒后调用 wxpay_query_order_by_out_trade_no 主动查单兜底
    },
    fail(err) {
      // 支付失败或用户取消：可通过 err.errMsg 判断是否为 cancel
    },
  })
}
```

---

## 与旧方案（wx.request + $w.auth）的对比

| 维度 | 旧方案（wx.request + Bearer Token） | 新方案（callHTTPFunction） |
|------|-----------------------------------|-----------------------------|
| 调用方式 | `wx.request` + 手动拼 URL | `wx.cloud.callHTTPFunction` |
| 鉴权 | 手动获取 `accessToken`，设置 `Authorization` header | 平台自动鉴权，无需 Token |
| openid | 需通过 `$w.auth.currentUser.openId` 获取并传入 | 平台自动注入 `x-wx-openid`，后端直接读取 |
| 域名配置 | 需配置 `tcloudbasegateway.com` 为合法域名 | `callHTTPFunction` 走平台内部通道 |
| 路由 | URL 拼接 `?webfn=true` + `_action` 字段 | `path` 参数走 Express 标准路由 |
| 复杂度 | 较高（Token 管理、URL 拼接、Header 设置） | **极简**（3 个参数：name/env/path） |

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | `callHTTPFunction is not a function` | 基础库版本过低 | 确保微搭构建的小程序基础库 ≥ 3.15.2 |
| 2 | 下单返回「appid 和 openid 不匹配」 | 集成中心的 `appId` 与微搭所用小程序 AppID 不一致 | 核对集成中心填写的 AppID 是否与微搭绑定的小程序一致 |
| 3 | openid 为空 | 真机未登录微信 / 开发者工具未设置 openid | 使用真机调试，或在开发者工具设置模拟 openid |
| 4 | 微搭页面方法中无法使用 `require` | 微搭自定义方法运行在沙箱环境 | 直接使用 `wx.cloud` 全局对象，无需引入 SDK |
| 5 | `requestPayment` 签名错误 | 后端返回的 `paySign` 签名串有问题 | 确认下单与调起使用同一私钥；检查 `package` 字段格式（需 `prepay_id=xxx`） |

---

## 与原生小程序方案的选型建议

| 场景 | 推荐方案 |
|------|---------|
| 快速搭建支付页面、无前端工程经验 | ✅ 微搭低码 |
| 需要完全自定义 UI、复杂交互 | 原生小程序 |
| 已有微搭应用、需追加支付功能 | ✅ 微搭低码 |
| 需要精细控制错误重试逻辑 | 原生小程序（参考 miniprogram-cloud-api.md） |

---

*原生小程序方案见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md) | 云托管版见 [miniprogram-cloud-run.md](miniprogram-cloud-run.md)*

# 微搭低码（WeDa）小程序接入微信支付

> 适合零开发、用低码搭建支付页面的场景。
> 微搭运行时已托管登录态与 Token 管理，无需自行执行 `signInWithOpenId`。

---

## 架构图

```
┌──────────────────┐                      ┌──────────────────┐
│  微搭低码页面      │   $w.auth            │  CloudBase Auth   │
│                  │ ──── openid ────────→ │  (运行时托管)      │
│  页面方法         │ ← accessToken(自动续)  │                  │
└──────────────────┘                       └──────────────────┘
       │                                            │
       │ Bearer Token                               │ 自动解码 JWT
       ▼                                            ▼
┌──────────────────┐   POST /v1/functions/   ┌──────────────────┐
│  wx.request       │   pay-common?webfn=true │  HTTP 云函数       │
│                  │ ←── {code,msg,data} ──│  (pay-common)      │
└──────────────────┘                        └──────────────────┘
```

**与原生小程序的区别**：

| 维度 | 原生小程序 | 微搭低码 |
|------|-----------|---------|
| 获取 openid | `signInWithOpenId()` 手动调用 | `$w.auth.currentUser.openId` 运行时提供 |
| 获取 accessToken | 手动管理过期 + 刷新 | `$w.auth.getAccessToken()` 自动续期 |
| Token 续期 | 自行处理 2 小时过期 | 微搭运行时自动续期，业务无需 `refreshSession` |
| 代码位置 | app.js + 页面文件 | 微搭页面 → 方法 → 自定义方法 |

---

## 前置条件

| 条件 | 说明 |
|------|------|
| 微搭应用 | 已创建并关联 CloudBase 环境 |
| 小程序身份源 | CloudBase 控制台 → 身份认证 → 开启「微信小程序」身份源 |
| pay-common 已部署 | 集成中心已创建微信支付集成（自动生成 HTTP 云函数） |
| 域名配置 | 微信公众平台 → request 合法域名 → 添加 `https://<envId>.api.tcloudbasegateway.com` |
| 微搭登录配置 | 微搭应用已开启登录，页面要求登录态 |

---

## 关键约束

1. **微搭工程必须已开启「微信小程序」身份源**——微搭运行容器复用同一份 CloudBase 环境
2. **`$w.auth.currentUser.openId` 已是当前用户在小程序 AppID 下的 openid**——直接传给 `payer.openid`，不要混用其他来源
3. **`$w.auth.getAccessToken()` 返回 `{ accessToken, ... }`**——有效期约 2 小时；微搭会自动续期，业务无需手动 `refreshSession`
4. **pay-common 函数 URL 使用集成创建后的真实函数名**——形如 `pay-050603-mdd8hhn8-demo-scfweb`，URL 末尾保留 `?webfn=true`
5. **域名须在微信公众平台「request 合法域名」中配置** `https://<envId>.api.tcloudbasegateway.com`

---

## 完整代码示例

将以下代码粘贴到微搭页面 → 方法 → 自定义方法：

```javascript
/**
 * 微搭页面方法：发起一次完整支付
 * 文档：https://cloud.tencent.com/document/product/1301/57912
 */
export default async function ({ event, data }) {
  // 1. 取用户身份与访问令牌（微搭运行时已托管）
  const openId = $w.auth.currentUser.openId
  const { accessToken } = await $w.auth.getAccessToken() // 2 小时有效，过期自动续

  const ENV_ID = 'your-env-id'                // ⚠️ 替换：云开发环境 ID
  const FN_NAME = 'pay-common'                // ⚠️ 替换：集成创建后生成的实际函数名
  const out_trade_no = 'ORDER_' + Date.now()

  // 2. 调用 pay-common 下单
  const orderRes = await new Promise((resolve, reject) => {
    wx.request({
      url: `https://${ENV_ID}.api.tcloudbasegateway.com/v1/functions/${FN_NAME}?webfn=true`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        _action: 'wxpay_order',
        description: '测试商品',
        out_trade_no,
        amount: { total: 20, currency: 'CNY' }, // 0.2 元（单位：分）
        payer: { openid: openId },
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

  // 3. 调起微信支付
  wx.requestPayment({
    timeStamp: p.timeStamp,
    nonceStr: p.nonceStr,
    package: p.package,                  // 形如 'prepay_id=wx20...'
    signType: p.signType || 'RSA',
    paySign: p.paySign,
    success() {
      wx.showToast({ title: '支付成功', icon: 'success' })
      // 前端仅用于更新 UI，最终以服务端回调为准
      // 建议 1-2 秒后用 wxpay_query_order_by_out_trade_no 主动查单兜底
    },
    fail(err) {
      if (err.errMsg && err.errMsg.includes('cancel')) {
        console.log('用户取消支付')
      } else {
        wx.showToast({ title: '支付失败', icon: 'error' })
      }
    },
  })
}
```

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | `$w.auth.currentUser` 为空 | 微搭应用未启用登录，或当前页面未要求登录态 | 检查微搭应用设置 → 确认已开启登录；检查页面是否配置了「需要登录」 |
| 2 | 下单返回「appid 和 openid 不匹配」 | 集成中心的 `appId` 与微搭所用小程序 AppID 不一致 | 核对集成中心填写的 AppID 是否与微搭绑定的小程序一致 |
| 3 | `accessToken` 取到但请求 401 | `Authorization` 头格式错误 | 必须是 `Bearer ${accessToken}`（注意 Bearer 后有空格） |
| 4 | 微搭页面方法中无法使用 `require` | 微搭自定义方法运行在沙箱环境 | 直接使用 `$w.auth` 全局对象，无需引入 SDK |
| 5 | Token 过期报错 | 极少数情况下自动续期失败 | 微搭运行时会自动续期，若遇到 401 可尝试刷新页面重新触发登录 |

---

## 与原生小程序方案的选型建议

| 场景 | 推荐方案 |
|------|---------|
| 快速搭建支付页面、无前端工程经验 | ✅ 微搭低码 |
| 需要完全自定义 UI、复杂交互 | 原生小程序 |
| 已有微搭应用、需追加支付功能 | ✅ 微搭低码 |
| 需要精细的 Token 管理与错误重试 | 原生小程序（参考 miniprogram-cloud-api.md） |

---

*原生小程序方案见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md) | 云托管版见 [miniprogram-cloud-run.md](miniprogram-cloud-run.md)*

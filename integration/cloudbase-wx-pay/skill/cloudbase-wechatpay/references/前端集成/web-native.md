# PC 扫码支付（Native）接入

> 基于 `pay-common/README.md` Step 5 Native 章节 + `example/react/` 整理。

---

## 适用场景

- PC 网页支付（扫码付款）
- 线下扫码收款终端
- 二维码展示 + 轮询查单

---

## 架构流程

```
PC 浏览器
  │
  ├─ 1. 展示商品 → 用户点击"去支付"
  │
  ├─ 2. 前端 POST /wxpay_order_native
  │   - 无需 openid
  │   - 无需 scene_info（可选传 IP）
  │
  ├─ 3. 后端返回 code_url（二维码链接）
  │
  ├─ 4. 前端用 qrcode 库生成二维码图片展示
  │
  ├─ 5. 用户用微信扫二维码 → 手机上完成支付
  │
  └─ 6. 前端轮询查单（每 2-3 秒）确认支付结果
      → SUCCESS → 显示"支付成功"
      → 超时 → 提示"超时未支付"
```

---

## 前提条件

| 条件 | 说明 |
|------|------|
| pay-common 已部署 | 云函数或云托管 |
| 二维码生成库 | 推荐 `qrcode` 或 `qrcodejs` |
| AppID | 公众号或小程序 AppID（Native 对两者都支持）|

---

## 核心代码示例

### 1. 下单获取二维码

```javascript
async function nativePay(description, amountFen) {
  const res = await fetch(`${PAY_COMMON_URL}/cloudrun/v1/pay/wxpay_order_native`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description,
      out_trade_no: 'NATIVE' + Date.now(),
      amount: { total: amountFen, currency: 'CNY' },
      // Native 不需要 openid 和 scene_info（可选传 payer_client_ip）
    }),
  }).then(r => r.json())

  if (res.code !== 0) throw new Error(res.msg)

  return res.data?.code_url  // weixin://wxpay/bizpayurl?pr=xxx
}
```

### 2. 生成并展示二维码

```html
<!-- HTML -->
<div id="qr-container">
  <div id="qr-code"></div>
  <p id="payment-status">请使用微信扫描二维码支付</p>
</div>
```

```javascript
// 使用 qrcode 库（需引入 qrcode.min.js）
import QRCode from 'qrcode'

async function showQRCode(codeUrl) {
  const container = document.getElementById('qr-code')
  container.innerHTML = ''

  // 生成二维码 canvas/img
  await QRCode.toCanvas(container, codeUrl, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// 或使用 img 标签方式（更简单）
async function showQRCodeAsImg(codeUrl) {
  const container = document.getElementById('qr-code')
  const dataUrl = await QRCode.toDataURL(codeUrl, { width: 256 })
  container.innerHTML = `<img src="${dataUrl}" alt="支付二维码" />`
}
```

### 3. 轮询查单（核心差异！）

> **Native 支付没有前端回调！** 必须轮询查单来确认支付状态。

```javascript
async function pollForPayment(outTradeNo, onPaid, onTimeout, onError) {
  const MAX_ATTEMPTS = 60          // 最多查 60 次
  const INTERVAL_MS = 3000         // 每 3 秒查一次
  const TIMEOUT_MIN = 10           // 10 分钟超时（code_url 有效期约 2 小时）

  let attempts = 0
  const startTime = Date.now()

  while (attempts < MAX_ATTEMPTS) {
    // 超时检查
    if ((Date.now() - startTime) > TIMEOUT_MIN * 60 * 1000) {
      return onTimeout?.('支付超时')
    }

    try {
      const res = await fetch(`${PAY_COMMON_URL}/cloudrun/v1/pay/wxpay_query_order_by_out_trade_no`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ out_trade_no: outTradeNo }),
      }).then(r => r.json())

      if (res.code !== 0) continue

      const state = res.data?.trade_state
      switch (state) {
        case 'SUCCESS':
          return onPaid?.(res.data)       // ✅ 支付成功
        case 'NOTPAY':
          break                             // 待支付，继续等
        case 'CLOSED':
          return onError?.('订单已关闭')
        case 'PAYERROR':
          return onError?.('支付失败: ' + res.data?.trade_state_desc)
        default:
          break
      }
    } catch (e) {
      console.error('查单异常:', e)
    }

    attempts++
    await new Promise(r => setTimeout(r, INTERVAL_MS))
  }

  return onError?.('查询次数已达上限')
}

// 使用示例
const orderNo = 'NATIVE' + Date.now()
const codeUrl = await nativePay('商品名称', 100)
await showQRCode(codeUrl)

pollForPayment(
  orderNo,
  (data) => {
    document.getElementById('payment-status').innerHTML =
      '<span style="color:green">✓ 支付成功！订单号: ' + data.transaction_id + '</span>'
  },
  () => {
    document.getElementById('payment-status').innerHTML =
      '<span style="color:orange">⏰ 支付超时，请重新下单</span>'
  },
  (msg) => {
    document.getElementById('payment-status').innerHTML =
      '<span style="color:red">✗ ' + msg + '</span>'
  }
)
```

### 4. 完整页面示例（参考 example/react/test-wx-pay.html）

`example/react/test-wx-pay.html` 是一个三合一测试页，包含 JSAPI、H5、Native 三种支付方式的入口和二维码展示。

---

## Native 支付特殊注意事项

| # | 注意事项 | 说明 |
|---|---------|------|
| 1 | **没有前端回调** | 不像小程序/H5 有 `requestPayment` 的 success/fail 回调，必须轮询 |
| 2 | **code_url 有效期约 2 小时** | 但建议 UI 上给出 10 分钟超时提示，引导用户重新下单 |
| 3 | **不支持撤销** | Native 下单只能关闭（close），不能像 JSAPI 一样撤销 |
| 4 | **AppID 类型灵活** | 公众号 AppID 或小程序 AppID 都可以用 |
| 5 | **无需 openid** | 扫码用户的身份在支付完成后才可知 |
| 6 | **轮询频率建议 2-3s** | 太频繁会浪费资源，太慢用户体验差 |

---

## 订单状态机

```
CREATE(创建) → NOTPAY(待支付) → SUCCESS(支付成功)
                    ↓                ↑
                 CLOSED(已关闭)   PAYERROR(支付失败)
                    ↑
                 (超时自动关闭 / 用户主动关闭)
```

| trade_state | 含义 | 建议操作 |
|-------------|------|---------|
| `NOTPAY` | 待支付 | 继续轮询 |
| `SUCCESS` | 支付成功 | 停止轮询，发货 |
| `CLOSED` | 已关闭 | 停止轮询，提示用户 |
| `REVOKED` | 已撤销 | 同 CLOSED（仅 JSAPI 支持） |
| `USERPAYING` | 支付中（付款码支付） | 继续轮询 |
| `PAYERROR` | 支付失败 | 停止轮询，提示错误 |

---

## 常见问题

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | 二维码扫不出 | code_url 格式错误 | 确认返回值是 `weixin://wxpay/bizpayurl?pr=...` 格式 |
| 2 | 扫码后提示"该订单不存在" | code_url 过期或订单被关闭 | 重新下单 |
| 3 | 轮询一直返回 NOTPAY | 用户确实未支付 | 正常行为，继续等或提示用户 |
| 4 | 轮询报错频繁 | 频率太高被限流 | 降低轮询间隔到 ≥ 2s |
| 5 | 支付成功但轮询没检测到 | 时序问题（支付回调还没处理完） | 多轮几次即可 |

---

*H5 支付见 [web-h5.md](web-h5.md) | APP 支付见 [app.md](app.md)*

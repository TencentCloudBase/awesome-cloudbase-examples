# H5 页面支付接入

> 基于 `pay-common/README.md` Step 5 H5 章节 + `examples/react/` 整理。

---

## 适用场景

- 手机浏览器内的 H5 页面（非微信内置浏览器）
- 公众号网页（JSAPI 模式）
- 需要 **H5 支付授权目录**配置

> **注意**：微信内 H5 页面应使用 **JSAPI 支付**（走 `/wxpay_order`），不是 H5 支付。

---

## 架构流程

```
手机浏览器 H5 页面
  │
  ├─ 1. 用户选择商品 → 进入结算页
  │
  ├─ 2. 前端 POST /wxpay_order_h5
  │   - 必传 scene_info（IP + h5_type）
  │   - 无需 openid
  │
  ├─ 3. 后端返回 h5_url（微信中间页 URL）
  │
  ├─ 4. 前端 window.location.href = h_url
  │     → 跳转到微信支付的中间页面
  │
  ├─ 5. 用户在微信中完成支付
  │     → 自动跳转回 redirect_url
  │
  └─ 6. 前端轮询查单确认结果
```

---

## 前提条件

| 条件 | 说明 |
|------|------|
| pay-common 已部署 | 云函数或云托管均可 |
| H5 支付授权目录 | 商户平台→产品中心→开发配置→支付授权目录 |
| 合法域名配置 | pay-common 的域名需要在商户平台备案 |
| HTTPS | H5 支付要求全链路 HTTPS |

---

## 核心代码示例

### 1. H5 下单请求

```javascript
async function h5Pay(description, amountFen) {
  // 获取用户真实 IP（关键风控字段！）
  const clientIp = await fetchClientIp()  // 需要一个后端接口返回客户端 IP

  const res = await fetch(`${BACKEND_URL}/cloudrun/v1/pay/wxpay_order_h5`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: description,
      out_trade_no: 'H5' + Date.now(),
      amount: { total: amountFen, currency: 'CNY' },
      scene_info: {
        payer_client_ip: clientIp,        // ⚠️ 必填！用户真实 IP
        h5_info: {
          type: 'Wap',                     // ⚠️ 必填！Wap=iOS/Android
          app_name: '商城',
          app_url: 'https://your-shop.com',
        },
      },
    }),
  }).then(r => r.json())

  if (res.code !== 0) throw new Error(res.msg)

  // 返回 h5_url，用于跳转
  return res.data?.h5_url
}

// 获取客户端 IP 的辅助接口
async function fetchClientIp() {
  const res = await fetch(`${BACKEND_URL}/cloudrun/v1/pay/client_ip`, {
    method: 'GET',
  }).then(r => r.json())
  return res.ip
}
```

### 2. 跳转微信中间页

```javascript
async function handleH5Pay() {
  try {
    const h5Url = await h5Pay('商品名称', 100)

    // 跳转到微信支付中间页
    // 用户将在微信中完成支付，然后跳转回 redirect_url
    window.location.href = h5Url
  } catch (e) {
    alert('下单失败: ' + e.message)
  }
}
```

### 3. 支付结果确认

> H5 支付没有前端回调（不像小程序的 `requestPayment`）。需要**轮询查单**或**设置回调跳转**来确认结果。

**方式 A：轮询查单**

```javascript
async function pollOrderStatus(outTradeNo, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${BACKEND_URL}/cloudrun/v1/pay/wxpay_query_order_by_out_trade_no`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ out_trade_no: outTradeNo }),
    }).then(r => r.json())

    if (res.code === 0 && res.data?.trade_state === 'SUCCESS') {
      return 'PAID'
    }

    await new Promise(r => setTimeout(r, 2000))  // 每 2 秒查一次
  }
  return 'TIMEOUT'
}
```

**方式 B：回调 redirect_url**

在下单时指定 `redirect_url`：

```javascript
body: JSON.stringify({
  // ... 其他字段
  scene_info: {
    // ... 其他字段
    redirect_url: encodeURI('https://your-shop.com/pay/result?no=H5xxxx'),
  },
})
```

> 注意：`redirect_url` 需要在商户平台配置的授权目录下。

---

## H5 支付必填字段详解

### scene_info 结构

```json
{
  "scene_info": {
    "payer_client_ip": "1.2.3.4",       // ⚠️ 必填，用户真实 IP
    "h5_info": {
      "type": "Wap",                      // ⚠️ 必填
      "app_name": "商城",                 // 选填，APP 名称
      "app_url": "https://shop.com",      // 选填，APP URL
      "device_id": "unique-device-id"     // 选填，设备标识
    }
  }
}
```

### h5_info.type 可选值

| type值 | 含义 |
|--------|------|
| `Wap` | 手机浏览器（最常用） |
| `IOS` | iOS 平板或手机 App 内 WebView |
| `Android` | Android 平板或手机 App 内 WebView |
| `PC` | PC Web（极少使用） |

---

## H5 支付授权目录配置

> **这是最常见的 H5 支付报错原因之一！**

### 配置路径

[商户平台](https://pay.weixin.qq.com/) → 产品中心 → 开发配置 → **支付授权目录**

### 规则

| 规则 | 说明 |
|------|------|
| 格式 | `https://domain.com/path/`（注意末尾斜杠！）|
| 数量 | 最多 5 个目录 |
| 匹配方式 | 前缀匹配，发起支付的页面 URL 必须在某个目录下 |
| 生效时间 | 修改后约 **10 分钟**生效 |

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 「当前页面无法发起支付」 | 授权目录未配置或 URL 不匹配 | 添加当前域名到授权目录 |
| 「缺少 scene_info 参数\" | 未传 payer_client_ip 或 h5_info.type | 补充必填字段 |
| 「网络环境未能通过安全验证\" | 风控拦截，IP 异常 | 确保 payer_client_ip 是真实 IP |

---

## 与 JSAPI 支付的区别

| 维度 | JSAPI（微信内） | H5（外部浏览器） |
|------|:--------------:|:---------------:|
| **触发环境** | 微信内置浏览器 | 任意手机浏览器 |
| **必传 openid** | 是 | 否 |
| **必传 scene_info** | 否 | **是（IP + h5_type）** |
| **授权目录** | 不需要 | **必须配置** |
| **支付流程** | `requestPayment` 弹窗 | 跳转微信中间页 |
| **结果确认** | `requestPayment` 回调 | **轮询查单** 或 redirect |
| **路由** | `/wxpay_order` | `/wxpay_order_h5` |

---

## 安全注意事项

1. **金额必须来自后端**：前端不可传金额，应由服务端根据商品 ID 查库确定
2. **防止重复支付**：提交订单前先检查是否已有未完成的订单
3. **h5_url 有效期 5 分钟**：过期需重新下单
4. **redirect_url 必须白名单**：防止开放重定向漏洞

---

*PC 扫码支付见 [web-native.md](web-native.md) | 小程序见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md)*

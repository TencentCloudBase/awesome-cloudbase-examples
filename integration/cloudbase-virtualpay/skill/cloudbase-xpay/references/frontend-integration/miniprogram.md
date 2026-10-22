# 小程序前端集成

完整可运行示例见 `examples/miniprogram/`。

## 版本要求

| 项 | 要求 |
|---|---|
| `wx.cloud.callHTTPFunction` | 基础库 ≥ **3.15.2** |
| `wx.requestVirtualPayment` | 基础库 ≥ **2.19.2** |
| iOS 端 | 微信 ≥ **8.0.68** 且已开通 IAP |
| 开发者工具 | Nightly ≥ 2.02.2608312 |

## 完整链路

```
① wx.login()                          拿 code
② callHTTPFunction → /xpay/create_order
       服务端：code → sessionKey → signData → paySig + signature
③ wx.requestVirtualPayment({ signData, mode, paySig, signature })
       客户端自行完成下单与收银台拉起
④ 平台推送 xpay_goods_deliver_notify → 服务端幂等发货
⑤ 前端查询订单状态展示结果
```

## 代码

```js
// 1. 拿 code
const { code } = await new Promise((resolve, reject) => {
    wx.login({ success: resolve, fail: reject });
});

// 2. 调云函数（平台自动鉴权，注入 x-wx-openid）
const res = await wx.cloud.callHTTPFunction({
    name: FUNCTION_NAME,
    config: { env: ENV_ID },
    method: 'POST',
    path: '/xpay/create_order',
    data: { code, productId: 'product_001', goodsPrice: 100, buyQuantity: 1 },
});
const { signData, mode, paySig, signature } = res.data.data;

// 3. 拉起支付
wx.requestVirtualPayment({
    signData, mode, paySig, signature,
    success: () => {},
    fail: (err) => {},
});
```

> `callHTTPFunction` 部分场景下 `res.data` 是字符串，需容错解析：
> `typeof res.data === 'string' ? JSON.parse(res.data) : res.data`

## 🚨 安全：价格不能由前端定

示例里 `productId` / `goodsPrice` 取自前端常量**仅用于演示**。
生产环境前端只传 **SKU**，价格必须由后端查出：

```js
// ✅ 正确：前端只传 SKU
data: { code, sku: 'month_card' }

// 后端
const product = await db.collection('products').doc(sku).get();
const signData = buildSignData({ ..., productId: product.id, goodsPrice: product.price });
```

否则攻击者可篡改请求把价格改成 1 分。

## 环境判断

```js
const base = wx.getAppBaseInfo ? wx.getAppBaseInfo() : {};
const device = wx.getDeviceInfo ? wx.getDeviceInfo() : {};

if (device.platform === 'ios' && compareVersion(base.version, '8.0.68') < 0) {
    // 提示升级微信
}
```

## 支付结果处理

```js
} catch (err) {
    if (err.errMsg?.includes('cancel')) {
        // 用户取消
    }
}
```

## ⚠️ 前端 success 不作为发货依据

用户支付后异常退出，前端回调就丢了。正确做法：

1. 以服务端 `xpay_goods_deliver_notify` 为准发货
2. 前端展示时调 `/xpay/query_order` 查真实状态

## iOS 退款入口

iOS 订单**隐藏退款按钮**，改为引导用户去 App Store 申请：

```js
wx.showModal({
    title: 'iOS 退款说明',
    content: '请前往 App Store → 购买记录 申请退款',
    showCancel: false,
});
```

## 测试注意

- **必须真机测试**，模拟器无法完成支付
- 沙箱模式在真机预览下会被 `PAYMENT_ILLEGAL_IN_SANDBOX` 拦截
- 道具发布后需等几分钟到半小时才能下单

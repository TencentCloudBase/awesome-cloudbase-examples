# APP 端支付接入

> 基于 `pay-common/README.md` Step 5 APP 章节 + wechatpay-basic-payment skill 引用整理。

---

## 适用场景

- 移动原生 APP（iOS / Android）
- 通过微信 OpenSDK 调起支付
- **签名格式与 JSAPI 不同！**

---

## APP vs JSAPI 签名的关键差异

> 这是最容易踩坑的地方！APP 支付的签名字段和格式与 JSAPI **完全不同**。

| 字段 | JSAPI（小程序） | APP（移动应用） |
|------|:--------------:|:--------------:|
| **timeStamp** | 字符串 `"1713927400"` | 字符串 `"1713927400"` （相同） |
| **nonceStr** | 随机字符串 | 随机字符串（相同） |
| **package** | `prepay_id=wx2014...` | **`Sign=WXPay`**（不同！） |
| **signType** | `RSA` | `RSA`（相同） |
| **paySign** | RSA 签名串 | **叫 `sign` 不是 `paySign`！（不同）** |
| **appId** | 不传 | **必须传！（不同）** |
| **partnerId** | 不传 | **必须传！（不同）** |

---

## 架构流程

```
移动 APP
  │
  ├─ 1. 用户选择商品 → 点击"去支付"
  │
  ├─ 2. APP 调用后端 /wxpay_order_app
  │   - 无需 openid
  │   - 返回 APP 专用签名参数
  │
  ├─ 3. APP 用微信 OpenSDK 发起支付
  │   - PayReq 对象（iOS）或 IWXAPI.sendReq（Android）
  │   - 字段：appId + partnerId + prepayId + package + nonceStr + timeStamp + sign
  │
  ├─ 4. 微信 APP 弹出支付界面
  │
  ├─ 5. 用户完成支付
  │
  └─ 6. 微信 SDK 回调通知 APP 支付结果
      → ⚠️ 这个结果仅供参考，应以查单为准
```

---

## 后端下单

```javascript
// 后端调用 /wxpay_order_app
const res = await fetch(`${PAY_COMMON_URL}/cloudrun/v1/pay/wxpay_order_app`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: '商品名称',
    out_trade_no: 'APP' + Date.now(),
    amount: { total: 100, currency: 'CNY' },
    // APP 不需要 openid！
  }),
}).then(r => r.json())
```

成功响应示例：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "appid": "wxd930ea5d5a258f4f",
    "partnerId": "1900000109",
    "prepayId": "wx201410272009395522657a690389285100",
    "package": "Sign=WXPay",
    "nonceStr": "5K8264ILTKCH16CQ2502SI8ZNMTM67VS",
    "timeStamp": "1713927400",
    "sign": "RSA签名串..."
  }
}
```

---

## iOS 端调用示例

```objective-c
#import "WXApi.h"

// 1. 构建支付请求对象
PayReq *req = [[PayReq alloc] init];
req.partnerId    = response[@"partnerId"];    // 商户号（注意不是 appId）
req.prepayId      = response[@"prepayId"];     // 预支付交易会话ID
req.nonceStr      = response[@"nonceStr"];     // 随机字符串
req.timeStamp     = [response[@"timeStamp"] unsignedIntValue];  // 时间戳
req.package       = response[@"package"];      // 固定值 "Sign=WXPay"
req.sign          = response[@"sign"];         // 签名（注意字段名叫 sign）

// 2. 调起微信支付
BOOL success = [WXApi sendReq:req];

if (!success) {
    NSLog(@"调起微信支付失败");
}
```

---

## Android 端调用示例

```java
import com.tencent.mm.opensdk.modelpay.PayReq;
import com.tencent.mm.opensdk.openapi.IWXAPI;
import com.tencent.mm.opensdk.openapi.WXAPIFactory;

// 1. 注册 APP（在 Application.onCreate 中）
IWXAPI api = WXAPIFactory.createWXAPI(context, "wxd930ea5d5a258f4f", true);
api.registerApp("wxd930ea5d5a258f4f");

// 2. 构建并发送支付请求
PayReq req = new PayReq();
req.appId       = response.getString("appId");        // ⚠️ APP 必须传
req.partnerId   = response.getString("partnerId");    // 商户号
req.prepayId    = response.getString("prepayId");
req.nonceStr    = response.getString("nonceStr");
req.timeStamp   = response.getString("timeStamp");
req.package     = response.getString("package");     // "Sign=WXPay"
req.sign        = response.getString("sign");       // ⚠️ sign 不是 paySign！

boolean result = api.sendReq(req);
if (!result) {
    Log.e("WXPay", "调起微信支付失败");
}
```

---

## Flutter / React Native / uni-app 适配

### uni-app

```javascript
// 使用 uni-pay 或自定义插件
uni.requestPayment({
  provider: 'wxpay',
  orderInfo: {
    appid: res.data.appid,
    partnerid: res.data.partnerId,
    prepayid: res.data.prepayId,
    package: res.data.package,        // "Sign=WXPay"
    noncestr: res.data.nonceStr,
    timestamp: res.data.timeStamp,
    sign: res.data.sign,             // ⚠️ sign 字段
  },
  success(res) {
    console.log('支付结果:', res)
  }
})
```

### React Native（react-native-wechat-lib）

```javascript
import * as WeChat from 'react-native-wechat-lib'

WeChat.pay({
  appId: res.data.appid,
  partnerId: res.data.partnerId,
  prepayId: res.data.prepayId,
  nonceStr: res.data.nonceStr,
  packageValue: res.data.package,    // "Sign=WXPay"
  timeStamp: res.data.timeStamp,
  sign: res.data.sign,               // ⚠️ sign 字段
})
```

---

## APP 支付的特殊注意事项

| # | 注意事项 | 说明 |
|---|---------|------|
| 1 | **package = "Sign=WXPay"** | 不是 JSAPI 的 `prepay_id=xxx` 格式！ |
| 2 | **sign 不是 paySign** | APP 的签名字段名叫 `sign`，不是 `paySign` |
| 3 | **必须传 appId** | JSAPI 不传 appId，但 APP 必须 |
| 4 | **partnerId = merchantId** | 就是商户号 |
| 5 | **不需要 openid** | APP 支付不依赖 openid |
| 6 | **AppID 类型必须是"移动应用"** | 在微信开放平台注册，不是公众平台 |
| 7 | **SDK 回调仅供参考** | 必须在后端查单确认最终状态 |
| 8 | **Universal Links** | iOS 需要配置 Universal Links 才能正常回调 |

---

## APP 签名校验清单

收到后端返回的 APP 支付参数后，按以下清单逐项检查：

- [ ] `appId` 存在且为移动应用 AppID（微信开放平台）
- [ ] `partnerId` 存在且等于商户号（merchantId）
- [ ] `prepayId` 以 `wx` 开头
- [ ] `package` 值为 **`Sign=WXPay`**（不是 `prepay_id=...`）
- [ ] `nonceStr` 为非空字符串
- [ ] `timeStamp` 为数字字符串（秒级）
- [ ] `sign` 存在（**不是 `paySign`**）

---

*更多 API 层面的签名算法细节，参见 [wechatpay-basic-payment](../wechatpay-basic-payment) skill*
*小程序接入见 [miniprogram-cloud-api.md](miniprogram-cloud-api.md) | H5 见 [web-h5.md](web-h5.md)*

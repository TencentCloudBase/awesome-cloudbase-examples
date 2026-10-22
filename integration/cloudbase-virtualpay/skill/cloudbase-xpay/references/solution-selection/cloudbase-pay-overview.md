# 支付方案选型：虚拟支付 vs 普通微信支付

## 一句话判断

| 你的场景 | 选哪个 |
|---|---|
| 卖**实物商品** | 普通微信支付（`cloudbase-wechatpay`，`pay-common`） |
| 卖**虚拟商品**（道具/代币/会员），且要上 iOS | **虚拟支付（本 Skill，`xpay-common`）** |

> 判断依据不是「金额大小」或「是否需要服务端」，而是**商品形态 + 终端**。虚拟商品在 iOS 上必须走 IAP，这是苹果政策硬要求。

---

## 两方案对比矩阵

| 维度 | 普通微信支付 pay-common | **虚拟支付 xpay-common** |
|---|---|---|
| 商品 | 实物 | **虚拟商品** |
| 客户端 API | `wx.requestPayment` | **`wx.requestVirtualPayment`** |
| iOS 虚拟商品 | ❌ 不支持 | ✅ **支持（平台侧 Apple IAP 能力）** |
| 服务端接口 | `/v3/pay/transactions/*` | **`/xpay/*`（米大师 Midas）** |
| 下单动作 | 服务端调统一下单拿 `prepay_id` | **服务端只出签名，客户端自行下单** |
| 回调通道 | 微信支付回调 + AES-GCM | **小程序消息推送** + AES-256-CBC |
| 验签归属 | 平台字段 `notifyURLCallbackType` | 平台字段 `notifyURLCallbackType` |
| 凭证 | 商户号 5 项 + PEM 证书 | OfferID + AppKey + AppID/AppSecret |
| 幂等键 | `out_trade_no` | 平台单号 `wx_order_id`（缺失回退 `OutTradeNo`） |
| 应答格式 | `{ code: 'SUCCESS' }` | **`{ ErrCode: 0, ErrMsg: 'success' }`** |
| 费率 | 约 0.6% | **安卓 1% / iOS 12%** |
| 结算 | T+1 | **安卓 T+3 / iOS 约 45–60 天** |

---

## 为什么虚拟支付不能复用 pay-common

虽然都叫「微信支付」，但业务层几乎无共同点：

| pay-common 的组件 | 虚拟支付是否可用 | 原因 |
|---|---|---|
| `sdkStrategy.js`（wechatpay SDK + PEM + RSA 签名） | ❌ | 虚拟支付用 HMAC-SHA256 双签名，无证书体系 |
| `_handleCallback` 的 AES-GCM 解密 | ❌ | 回调走消息推送，解密在网关完成 |
| 凭证体系（商户号/证书序列号/APIv3 密钥） | ❌ | 换成 OfferID + AppKey |
| 回调验签归属 | ✅ | 两边都由平台字段声明，**不提供业务侧开关**（虚拟支付走消息推送） |
| Express 骨架 | ✅ | 直接复用（鉴权依赖上游网关，不再自带中间件） |
| 云 API 适配层 | ✅ | 复用，事件前缀换成 `xpay_` |
| Dockerfile / scf_bootstrap | ✅ | 复用 |

**结论**：新建独立模板 `xpay-common`，只复用骨架，业务层重写。

---

## 虚拟支付的独有约束

### 1. iOS 端必须走 Apple IAP

- 需先在 MP 后台配置**小程序简称**（Apple 展示名）并**开通苹果 IAP**
- 用户微信客户端需 **≥ 8.0.68**
- 费率 **12%**（Apple 佣金），结算约 45–60 天
- **开发者无法主动退款**，只能由用户在 App Store 申请

### 2. 双签名是必须封装的一层

普通支付后端调接口拿 `prepay_id` 即可；虚拟支付要求业务侧自己构造 `signData` 并计算 `paySig` / `signature`。**这是集成要封装掉的核心复杂度**，详见 `dual-signature.md`。

### 3. 费率与结算差异大

| 终端 | 费率 | 结算周期 | 谁能退款 |
|---|---|---|---|
| 安卓 / 鸿蒙 / Windows | 1%（腾讯技术服务费） | T+3 | 开发者主动退 |
| iOS | **12%**（Apple 佣金） | 约 45–60 天 | **仅用户（App Store）** |

- 支付时间 180 天以内的退款退还手续费，**超过 180 天不退**
- 发票可在次月 5 号后申请开具上月的腾讯技术服务费发票

### 4. 个人主体的限制

- 服务类目需含「工具」
- 全终端**月支付限额 10 万元**

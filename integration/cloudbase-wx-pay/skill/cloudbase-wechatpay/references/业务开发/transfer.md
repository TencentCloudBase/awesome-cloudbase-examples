# 商家转账注意事项

> 基于 `pay-common/README.md` §商家转账 + `merchant-transfer-analysis.md` 整理。

---

## 能力概述

pay-common 内置**商家转账（免密小额）**能力，适用于：
- 提现到用户零钱
- 佣金/奖励结算
- 退款补偿

---

## 关键限制

| 限制项 | 值 | 说明 |
|--------|---|------|
| 单笔最低 | **0.3 元** | 低于此金额会报错 |
| 单笔最高（免密） | **< 2000 元**（即 ≤1999.99） | 超过需 RSA 加密 user_name |
| 免密额度说明 | 每日累计有商户级限制 | 具体限额以商户平台为准 |
| 同一单号重试期 | **3 个自然日** | 超过需换新单号 |
| 受理 ≠ 成功 | `ACCEPTED` 只是"已受理" | 必须查单或等回调确认最终状态 |

---

## 后端调用

### 发起转账

```bash
curl -X POST http://localhost:3000/cloudrun/v1/pay/wxpay_transfer \
  -H "Content-Type: application/json" \
  -d '{
    "out_bill_no": "BILL'"$(date +%Y%m%d%H%M%S)"'",
    "transfer_amount": 100,
    "openid": "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o"
  }'
```

响应：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bill_no": "BILL20260424143000",
    "mchId": "YOUR_MERCHANT_ID"
  }
}
```

> **重要**：返回的 `mchId` 必须传给前端 `wx.requestMerchantTransfer` 使用！

### 小程序端调起转账确认页

```javascript
// 小程序中调起转账确认页面（需要 mchId！）
wx.requestMerchantTransfer({
  mchId: res.data.mchId,        // 从后端获取，不可硬编码！
  appId: 'YOUR_APP_ID',
  outBillNo: res.data.data?.bill_no,
  success(res) {
    console.log('转账结果:', res)
  },
  fail(err) {
    console.error('转账失败:', err)
  }
})
```

### 查询转账单

```bash
# 按商户单号查
curl -X POST .../wxpay_transfer_bill_query \
  -d '{"out_bill_no": "BILL20260424143000"}'

# 按微信单号查
curl -X POST .../wxpay_transfer_bill_query_by_no \
  -d '{"bill_id": "wechat-bill-id-xxx"}'
```

---

## 转账状态机

```
CREATE(发起) → ACCEPTED(受理) ─→ SUCCESS(成功)
                     ↓
                PROCESSING(处理中)
                     ↓
                FAIL(失败) ← ─ 用户 24h 未确认自动退回
                     ↑
                EXCEPTION(异常) ← 需人工介入
```

| trade_state | 含义 | 处理建议 |
|-------------|------|---------|
| `ACCEPTED` | 已受理 | 正常，等待用户确认或系统处理 |
| `PROCESSING` | 处理中 | 继续等待或轮询 |
| `SUCCESS` | 转账成功 | 到账完成 |
| `FAIL` | 失败 | 查看原因（如余额不足、用户拒收） |
| `EXCEPTION` | 异常 | 需人工查看，联系微信支付客服 |

> **关键提醒**：`ACCEPTED` **不等于**转账成功。必须在 24 小时内通过查单或等待回调来确认最终状态。如果用户 24h 未在微信中确认收款，系统将自动关单并原路退款。

---

## mchId 透传问题（最高频坑）

这是小程序商家转账最常见的错误：

### ❌ 错误做法

```javascript
// 硬编码 mchId —— 会因为环境不同而出错
wx.requestMerchantTransfer({
  mchId: 'YOUR_MERCHANT_ID',   // ❌ 测试环境的 mchId 和生产不同！
})
```

### ✅ 正确做法

```javascript
// mchId 从后端下单接口返回值中获取
const transferRes = await callPayCommon('wxpay_transfer', {
  out_bill_no: 'BILL' + Date.now(),
  transfer_amount: 100,
  openid: currentUserOpenid,
})

if (transferRes.code !== 0) throw new Error(transferRes.msg)

// ⭐ 从后端返回的数据中提取 mchId
const mchId = transferRes.data?.mchId || transferRes.data?.data?.mchId
if (!mchId) throw new Error('后端未返回 mchId')

wx.requestMerchantTransfer({
  mchId: mchId,  // ✅ 动态获取，自适应环境
  appId: getApp().globalData.appid,
  outBillNo: transferRes.data?.data?.bill_no || 'BILLxxx',
  success: () => { /* ... */ },
})
```

### 为什么 mchId 要从后端获取？

| 环境 | mchId 来源 |
|------|-----------|
| 本地开发 | 开发测试商户号 |
| 云函数部署 | 生产商户号（可能不同） |
| 多商户 SaaS | 不同租户用不同 mchId |

---

## 固定 IP 要求

> 微信支付要求商家转账接口的调用方具有**固定出口 IP**。

| 部署方式 | 是否需要固定 IP | 解决方案 |
|---------|:--------------:|---------|
| HTTP 云函数 | **是** | CloudBase 控制台 → 云函数 → 开启**固定出口 IP**（付费功能） |
| 云托管 | **是** | 配置 NAT 网关或使用固定 EIP |
| 自建服务器 | 是（天然固定） | 默认已有固定公网 IP |
| 本地开发 | 否（仅调试用） | 无需配置 |

### 云函数开启固定 IP

1. 进入 CloudBase 控制台 → **云函数**
2. 找到 `pay-common` 函数
3. **访问配置** → 开启**固定出口 IP**
4. 在[商户平台](https://pay.weixin.qq.com/) → 产品中心 → 商家转账 → **API IP 白名单**中添加该 IP

---

## 金额不在允许范围内

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 「金额不在允许范围内」 | < 0.3 元或 ≥ 2000 元 | 调整金额；≥2000 元需实现 user_name RSA 加密 |

### ≥2000 元转账的实现方案

当需要支持大额转账时：

1. 实现 `user_name` 字段的 **RSA 加密**（加密收款人真实姓名）
2. 使用微信提供的公钥进行加密
3. 加密后的 `user_name` 作为请求参数传入

> 详细加解密方式参见 wechatpay-basic-payment skill 或微信支付官方文档。

---

## 转账回调

与支付回调类似，转账也有独立的通知回调：

| 路由 | 方法 | 说明 |
|------|------|------|
| `/cloudrun/v1/pay/transferTrigger` | POST | 转账结果通知（SDK 模式） |

> SDK 模式下回调走 HTTP 访问服务，Gateway 模式回调地址指向集成中心（控制台自动生成）。

### 回调处理要点

```javascript
async handlerTransferTrigger(params) {
  const billNo = params.out_bill_no

  // 1. 幂等检查
  const existing = await db.collection('transfers').where({ out_bill_no: billNo }).get()
  if (existing.data[0]?.status !== 'PROCESSING') return true

  // 2. 更新状态
  const state = params.trade_state  // SUCCESS / FAIL
  await db.collection('transfers').where({ out_bill_no: billNo }).update({
    status: state,
    result: params,
    updated_at: new Date(),
  })

  // 3. SUCCESS → 业务逻辑（如更新用户余额）
  if (state === 'SUCCESS') {
    await this._onTransferSuccess(existing.data[0])
  }

  return true
}
```

---

## 常见问题速查

| # | 问题 | 原因 | 解决方案 |
|---|------|------|---------|
| 1 | 「商户号错误」 | mchId 为空或硬编码错误 | 从后端返回值动态获取 |
| 2 | 「金额不在允许范围内」 | < 0.3 或 ≥ 2000 元 | 调整金额或实现 user_name 加密 |
| 3 | 「频率超限」 | 同一单号短时间多次请求 | 用相同参数 + 相同 out_bill_no 重试 |
| 4 | 「SYSTEM_ERROR」 | 微信服务端暂时异常 | 用同一单号重试（3 个自然日内有效） |
| 5 | 转账受理成功但没到账 | 用户 24h 内未确认 | 这是正常行为；超时会自动退款 |
| 6 | 「签名错误」 | 与支付共用私钥没问题？ | 转账和支付使用相同的签名方式 |
| 7 | 「IP 不在白名单」 | 未配置固定 IP 或未添加白名单 | 参考上文"固定 IP 要求" |

---

*订单服务见 [order-service.md](order-service.md) | 安全清单见 [security-checklist.md](security-checklist.md)*

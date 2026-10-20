# 退款

## 终端差异（关键）

| 终端 | 谁能退款 | 方式 | 结算 | 费率 |
|---|---|---|---|---|
| 安卓 / 鸿蒙 / Windows | **开发者主动** | MP 后台 或 `/xpay/refund_order` | T+3 | 1% |
| iOS | **仅用户** | App Store → 购买记录申请 | 约 45–60 天 | 12% |

> 🚨 **iOS 订单开发者无法主动退款**。调用 `/xpay/refund_order` 对 iOS 订单无效。

## 主动退款（安卓等）

```js
await strategy.refundOrder({
    openid,
    outTradeNo,        // 原业务单号
    outRefundNo,       // 退款单号（自生成，唯一）
    refundAmount,      // 退款金额，单位分
    env: 0,
}, sessionKey);
```

⚠️ 重试必须复用**同一个 `out_refund_no`**，换新号 = 多退钱。

## iOS 退款流程

```
用户 App Store 申请退款
        ↓
Apple 向开发者发起退款问询 ×3（每次须 3 秒内应答）
        ↓  开发者应答 result_code（0 放过 / 1 拦截）+ evidence
Apple 审批
        ↓ 通过
平台推送 xpay_refund_notify
        ↓
业务侧：更新订单状态 + 回收道具（与安卓一致）
```

**前端建议**：iOS 订单隐藏退款按钮，改为引导文案（引导去 App Store 申请）。

## 手续费

- 支付时间 **180 天以内**的退款，平台退还手续费
- **超过 180 天不退还**

## 回调处理

`xpay_refund_notify` 到达后：

1. 幂等校验（平台单号 `wx_order_id`，缺失时回退 `OutTradeNo`）
2. 更新订单状态为 `REFUNDED`
3. **回收已发放的道具 / 代币**
4. 应答成功

> 模板示例只更新了订单状态，**道具回收需业务侧实现**（`xpayService.js` 标注了 `TODO(业务侧)`）。

## 对账与提现

- MP 后台【虚拟支付】查看账户余额、每日账单并发起提现
- `/xpay/download_bill` 可下载小程序账单
- 发票可在**次月 5 号后**申请开具上月的腾讯技术服务费发票

## 检查清单

- [ ] 区分终端：iOS 不调用主动退款接口
- [ ] `out_refund_no` 重试时复用同一值
- [ ] 退款回调有幂等
- [ ] 退款后回收道具/代币
- [ ] 前端 iOS 订单隐藏退款入口

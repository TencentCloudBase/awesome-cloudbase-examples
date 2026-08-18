# API 路由速查表

> 基于 `pay-common/README.md` §路由表。下单/查询/退款/转账路由前缀为 `/wxpay_*`，回调路由为 `/*Trigger`。

---

## 下单路由

| 路由 | 方法 | 说明 | 必传字段 |
|------|------|------|---------|
| `/wxpay_order` | POST | JSAPI/小程序下单 | description, out_trade_no, amount.total(CNY分), payer.openid |
| `/wxpay_order_h5` | POST | H5 下单 | 同上 + scene_info(payer_client_ip, h5_info) |
| `/wxpay_order_native` | POST | Native 扫码下单 | 同上 + scene_info(payer_client_ip)，无需 openid |

## 查询路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/wxpay_query_order_by_out_trade_no` | POST | 商户订单号查单 |
| `/wxpay_query_order_by_transaction_id` | POST | 微信订单号查单 |
| `/wxpay_close_order` | POST | 关闭订单 |

## 退款路由

| 路由 | 方法 | 说明 | 注意事项 |
|------|------|------|---------|
| `/wxpay_refund` | POST | 申请退款 | 同一订单最多 50 次部分退款；重试必须复用 out_refund_no |
| `/wxpay_refund_query` | POST | 查询退款 | - |

## 商家转账路由（升级版-单笔模式）

| 路由 | 方法 | 说明 | 注意事项 |
|------|------|------|---------|
| `/wxpay_transfer` | POST | 发起商家转账 | 0.3 元 ≤ 金额 < 2000 元；不填 user_name；ACCEPTED ≠ 成功 |
| `/wxpay_transfer_bill_query` | POST | 商户单号查转账 | - |
| `/wxpay_transfer_bill_query_by_no` | POST | 微信单号查转账 | - |

## 回调路由（无鉴权）

| 路由 | 方法 | 说明 |
|------|------|------|
| `/unifiedOrderTrigger` | POST | 支付回调通知（SDK 模式） |
| `/refundTrigger` | POST | 退款回调通知（SDK 模式） |
| `/transferTrigger` | POST | 转账回调通知（SDK 模式） |

---

## SDK 验签模式的硬性约束

| # | 约束 | 违反后果 |
|---|------|---------|
| 1 | 回调必须走 HTTP 访问服务，不能走云 API 网关 | 云 API 网关会加鉴权层/篡改请求格式导致验签失败 |
| 2 | HTTP 访问服务的回调路由不能开启身份认证 | 微信回调不带 Token，开了身份认证被 401/403 拦截 |
| 3 | 回调 URL 必须带完整路径（含路由 Path） | 漏写则回调 404 |
| 4 | 必须在商户平台设置 APIv3 密钥 | 未设置 = 收不到任何回调通知 |
| 5 | 回调处理必须在 5 秒内返回应答 | 超时触发重试（~15 次/最长 24h） |

> **简单总结：SDK 模式 = 开 HTTP 访问服务 → 关掉回调路由身份认证 → 设 APIv3 密钥 → 回调 URL 写完整 → 5 秒内返回**
>
> **对比 Gateway 模式**：回调地址由集成中心自动生成，直接复制填入即可，无特殊部署约束。
>
> 详细操作步骤见 `references/模板接入/quick-start.md` Step 4.2-4.5

---

## 请求/响应格式

```json
// 成功请求示例（JSAPI）
{"description": "商品名称", "out_trade_no": "ORDER20260424001", "amount": {"total": 100, "currency": "CNY"}, "payer": {"openid": "oUpF8xxx"}}

// 成功响应
{"code": 0, "msg": "success", "data": {"prepay_id": "wx201410272009395522657a690389285100"}}

// 失败响应
{"code": -1, "msg": "amount.total 必须为正整数（单位：分）", "data": null}

// 回调应答（必须 5 秒内返回）
{"code": "SUCCESS", "message": "成功"}
```

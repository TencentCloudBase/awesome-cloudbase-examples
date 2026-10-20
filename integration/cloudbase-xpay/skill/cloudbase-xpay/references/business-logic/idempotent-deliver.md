# 幂等发货

## 为什么必须做

微信在两种情况下会重复投递同一事件：

1. **应答格式不对或返回非 0** → 重推最多 15 次（指数退避 2/4/8/16…）
2. 网络抖动等异常

模板示例用内存 `Set` 去重，**但云函数冷启动会丢失内存状态**，生产环境必须落库。

## 发货需要的三个字段

`outTradeNo` 只回答「哪一单」，**发不了货**。必须从推送里再取三个字段：

| 字段 | 官方路径 | XML 平铺 | 用途 |
|---|---|---|---|
| 道具 ID | `GoodsInfo.ProductId` | `ProductId` | 发哪件 |
| 数量 | `GoodsInfo.Quantity` | `Quantity` | 发几个（**按数量发放，不是发一个**） |
| 透传数据 | `Attach` | `Attach` | 下单时传入的 `attach` 原样返回，可带 uid / SKU |

模板已在 `handleCallback` 里解析好，业务侧直接用：

```js
const result = await xpayService.handleCallback(body);
result.goods; // { productId: 'goods_001', quantity: 2, attach: 'uid=123' }
```

### 商品信息不全时的口径

「缺什么都兜底、一律回 `ok: true`」是最坏的组合：微信不再重推、订单永久丢发货，日志里连一条错误都没有。现在的处理是：

| 情形 | 处理 |
|---|---|
| `ProductId` 缺失（发货事件） | 标记订单 `GOODS_MISSING` + 抛 `nonRetryable`：重推也补不上字段，但异常订单留在库里等对账 |
| `Quantity` **字段缺失** | 按 **1** 发放，返回 `goodsValid: false` / `missingFields: ['Quantity']` |
| `Quantity` **存在但非法**（0 / 1.5 / "2 个"） | 发货事件**抛错触发微信重推**：静默改成 1 = 用户买了 5 件只发 1 件，钱已收、货少发，还没有任何告警 |
| 退款 / 代币事件缺商品信息 | 状态照常流转（退款状态不更新是更大资损）+ 记 error 日志 + `missingFields`，走对账 |
| 退款 / 代币事件 `Quantity` **非法** | 状态照常流转 + 记 error 日志 + `goodsValid: false` / `missingFields: ['Quantity']`，`goods.quantity` 为 **null**（不静默按 1），走对账 |

业务侧拿到结果后应判断：

```js
const result = await xpayService.handleCallback(body);
if (!result.goodsValid) {
  // 商品信息不全：落异常表 / 告警，人工对账确认「该发什么、发几个」
  reportAnomaly(result.outTradeNo, result.wxOrderId, result.missingFields);
}
```

## 幂等键：平台单号优先

```js
const idempotencyKey = wxOrderId || outTradeNo;
```

**优先用平台单号（`wx_order_id`），商家单号只作兜底。**

> 🚨 为什么不能只用 `OutTradeNo`：
> 用户取消支付后重新下单，**可能复用同一个 `OutTradeNo`**。
> 用商家单号去重，第二笔会被误判成「重复事件」直接忽略 → **漏发货**。
> 平台单号由微信侧生成，每笔交易唯一，不存在这个问题。

平台单号在推送里有三种形态，都要认：

| 形态 | 字段路径 | 出现场景 |
|---|---|---|
| 嵌套 | `WeChatPayInfo.MchOrderNo` | JSON 推送 |
| 平铺 | `MchOrderNo` | XML 推送（一层解析后嵌套被打平） |
| 下划线 | `wx_order_id` | 部分文档写法 |

对应代码 `xpayService.js`：

```js
const wxOrderId = event?.WeChatPayInfo?.MchOrderNo
    || event?.MchOrderNo
    || event?.wx_order_id;
```

`OutTradeNo` 仍然要留着 —— 它是你自己订单表的主键，用于关联业务数据和对账。

## 生产实现建议

### 方案：数据库唯一索引 + 状态机

```js
// 伪代码：利用唯一索引做原子去重
async function deliverOnce(idempotencyKey, outTradeNo, handler) {
    try {
        await db.collection('xpay_deliver_log').add({
            _id: idempotencyKey,      // ← 平台单号做主键，天然去重
            outTradeNo,               // ← 业务单号用于关联订单
            state: 'DELIVERED',
            deliveredAt: Date.now(),
        });
    } catch (err) {
        // 主键冲突 = 已处理过，直接返回成功
        if (isDuplicateKeyError(err)) {
            return { duplicated: true };
        }
        throw err;
    }
    await handler();                  // 真正的发货逻辑
    return { duplicated: false };
}
```

> ⚠️ 去重表的主键用**平台单号**，订单表的主键用**业务单号**，两张表不要混为一张。
> 混用的后果就是上面那个「复用 OutTradeNo 漏发货」的坑。

### 状态机

```
PENDING ──发货推送──> DELIVERED ──退款推送──> REFUNDED
                          │
                          └──代币支付──> COIN_PAID
```

更新前**先查状态**，避免重复发货：

```js
const order = await db.collection('xpay_orders').doc(outTradeNo).get();
if (order.state === 'DELIVERED') return { duplicated: true };
```

## 双保险：查单兜底

发货以「发货推送」为主，`/xpay/query_order` 查单兜底。

**为什么不能用前端 `success` 回调**：用户支付后异常退出，前端回调就丢了。

建议加一个定时任务（如每 5 分钟）扫描 `PENDING` 且超过 N 分钟的订单，
调 `/xpay/query_order` 确认状态后补发货。

## 通知已发货（可选）

道具直购场景可调用 `/xpay/notify_provide_goods` 通知平台发货完成：

```js
await strategy.notifyProvideGoods({ openid, outTradeNo, env }, sessionKey);
```

## 模板当前实现

`xpayService.handleCallback()` 的顺序是**查重 → 处理 → 落标记**：

```js
// 幂等键：平台单号优先，缺失时回退商家单号
const idempotencyKey = wxOrderId || outTradeNo;

// 1) 只查重，不落标记
if (semantic.idempotent && idempotencyKey && this.processedEvents.has(idempotencyKey)) {
    return { ok: true, duplicated: true, eventType, outTradeNo, wxOrderId };
}

// 2) 业务处理 —— 抛错则冒泡，controller 会回非 0 触发微信重推
switch (semantic.biz) { /* ... */ }

// 3) ✅ 成功后才落标记
if (semantic.idempotent && idempotencyKey) {
    this._markProcessed(idempotencyKey);
}
```

⚠️ **不要改成先落标记再处理**。先标记的话，处理失败时标记已存在，
微信重推会被当作重复事件忽略 → 永久丢单。

⚠️ 仍是**内存实现，仅供演示**（`Set` 带 5000 条容量上限，超限淘汰最早记录）。
接入生产前必须替换为数据库唯一索引 —— 云函数冷启动会丢内存状态。
`xpayService.js` 里已标 `TODO(业务侧)`。

## 检查清单

- [ ] 幂等键用**平台单号** `wx_order_id`（三种字段形态都兼容），商家单号仅兜底
- [ ] 去重存储是**持久化的**（数据库唯一索引），不是内存
- [ ] 应答在任何分支都返回成功（包括重复事件）
- [ ] 有查单兜底任务
- [ ] 发货逻辑本身也是幂等的（不会因为重入多发一次货）

# 回调事件与应答

## 通道

虚拟支付的发货、代币、退款、投诉、风控等事件统一走**小程序消息推送**通道，
不是另设一套独立回调。推送体与其他事件通知同构。

```
微信平台 ──推送──> 集成中心回调网关（验签 + 解密）
                        ↓ 明文
                   集成函数 /xpay/callback
```

## 通用字段

| 字段 | 说明 |
|---|---|
| `ToUserName` | 小程序原始 ID |
| `FromUserName` | 固定为微信官方 openid |
| `CreateTime` | 创建时间 |
| `MsgType` | 固定 `event` |
| `Event` | 事件类型（分发依据） |
| `OpenId` | 用户 openid |
| `OutTradeNo` | **业务订单号**（关联订单表；幂等键优先用平台单号，见下） |
| `Env` | `0` 现网 / `1` 沙箱 |
| `RetryTimes` | 重推次数，从 0 开始 |

## 事件清单

| Event | 语义 | 幂等 | 处理要点 |
|---|---|---|---|
| `xpay_goods_deliver_notify` | 道具发货 | ✅ | **核心事件**：幂等发货 |
| `xpay_coin_pay_notify` | 代币支付 | ✅ | 更新代币余额 |
| `xpay_refund_notify` | 退款 | ✅ | 更新订单状态 + 回收道具 |
| `xpay_complaint_notify` | 用户投诉 | ❌ | 记录，人工跟进 |
| `xpay_wxpay_callback_notify` | 风控事件 | ❌ | 记录，按需申诉 |
| `xpay_subscribe_ios_refund_query_notify` | **iOS 退款问询** | ❌ | **3 秒内应答** |

> iOS 端另有订阅相关事件：`xpay_subscribe_signing_result_notify`（签约结果）、
> `xpay_subscribe_pay_fail_notify`（订阅支付失败），模板当前未实现，可按需扩展。

## 🚨 应答格式必须与推送一致

| 推送格式 | 应答体 |
|---|---|
| XML | `<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>` |
| JSON | `{"ErrCode":0,"ErrMsg":"success"}` |
| 通用兜底 | 空串 或 `success` |

**格式不对或返回非 0 ⇒ 微信重新推送，最多 15 次**，重试间隔指数退避（2、4、8、16…）。

模板实现：**只跟随请求本身**判断应答格式，不依赖配置（原先的 `notifyFormat` 已删除）——
先看 `content-type`，没有该头时看请求体是否 `<xml` 开头，其余一律 JSON。

```js
function isXmlRequest(req) {
    const ct = req.headers['content-type'] || '';
    if (/xml/i.test(ct)) return true;
    if (/json/i.test(ct)) return false;

    // 没有 content-type（少见）：看请求体形态，不读配置
    const raw = req.rawBody ? String(req.rawBody) : '';
    return raw.trimStart().startsWith('<xml');
}
```

## iOS 退款问询（专属硬约束）

Apple 不支持开发者主动退款，用户可在 App Store 申请。此时 Apple 会**连续发起 3 次问询**，
开发者每次须在 **3 秒内**应答，除标准应答外还要带 `IosRefundQueryResponse`：

| 字段 | 必填 | 说明 |
|---|---|---|
| `result_code` | ✅ | `0` = 放过（建议退款）；`1` = 拦截（拒绝退款） |
| `result_info` | 否 | 结果描述 |
| `evidence` | ✅ | 决策凭据，用于退款审计（如「订单未发货，建议退款」） |

- 3 次均超时未应答 ⇒ 微信向 Apple 返回「不确定」，**退款决定权交给 Apple**
- 开发者应答**仅作参考**，最终由 Apple 决定
- Apple 批准后仍会推 `xpay_refund_notify`

模板默认策略：未发货 → `result_code=0`（放过）；已发货 → `result_code=1`（拦截）。
**生产环境应按真实业务规则改写 `_decideIosRefund()`**，判断逻辑建议压到 1 秒内。

应答示例：

```json
{
  "ErrCode": 0,
  "ErrMsg": "success",
  "IosRefundQueryResponse": {
    "result_code": 0,
    "result_info": "订单未发货，建议退款",
    "evidence": "订单 IOS20261014001 状态=UNKNOWN"
  }
}
```

## 幂等

同一笔订单可能因重推多次到达，**必须以平台单号 `wx_order_id` 去重**（推送字段 `WeChatPayInfo.MchOrderNo`）。

取值要兼容三种形态：

```js
const wxOrderId = event?.WeChatPayInfo?.MchOrderNo   // JSON 推送（嵌套）
    || event?.MchOrderNo                             // XML 推送（解析后嵌套字段被平铺到顶层）
    || event?.wx_order_id;

const idempotencyKey = wxOrderId || outTradeNo;      // 缺失时回退商家单号
```

> ⚠️ 为什么不用 `OutTradeNo` 做主键：用户取消后重新下单可能复用同一个商家单号，用它会误判成「重复」→ 漏发货。平台单号才是权威标识。

🚨 **顺序很关键：先查重 → 再处理 → 最后落标记**。

```js
// 1) 只查重，不落标记
if (semantic.idempotent && idempotencyKey && this.processedEvents.has(idempotencyKey)) {
    return { ok: true, duplicated: true };
}

// 2) 业务处理（抛错则让异常冒泡，由 controller 返回非 0 触发微信重推）
await this.deliver(outTradeNo);

// 3) ✅ 业务成功后才落标记
if (semantic.idempotent && outTradeNo) {
    this._markProcessed(outTradeNo);
}
```

**反例（会永久丢单）**：先 `add(outTradeNo)` 再处理业务。
一旦处理抛错，标记已经存在，微信重推时会被判定为「重复事件」直接返回成功 →
**这单永远不会再发货**。

> 模板示例用内存 `Set`（带容量上限，超限淘汰最早记录），
> **生产环境必须换数据库 `OutTradeNo` 唯一索引** —— 云函数冷启动会丢失内存状态。

## 应答策略：错误分级

不要「所有错误都回 0」，也不要「所有错误都回非 0」：

| 错误类型 | 应答 | 理由 |
|---|---|---|
| 结构性错误（缺 `Event` 字段、事件根本不存在） | `ErrCode = 0` | 重推多少次都不会变好，回 0 避免 15 次无效重推 |
| 业务异常（发货失败、下游超时、数据库抖动） | `ErrCode ≠ 0` | 正是重试机制该发挥作用的场景，回非 0 触发指数退避重推 |

**都回 0** → 静默丢单；**都回非 0** → 无效请求把重试次数耗尽，同样丢单。

模板实现：`xpayService` 对结构性错误抛 `err.nonRetryable = true`，
controller 据此区分两种应答；其他异常一律按可重试处理。

## 应答要快

耗时操作（发货、推送、外部 API）应异步化，不要阻塞应答。iOS 退款问询尤其要压进 3 秒。

## XML 推送解析

网关按登记格式转发，可能收到 XML 字符串。模板用 `utils/xml.js` 解析：

```js
const re = /<([A-Za-z_][\w.-]*)\s*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/g;
```

> ⚠️ 内容部分必须用 `[^<]*` 而非 `[\s\S]*?`：
> 若允许内容含 `<`，外层 `<xml>` 会被优先匹配并把所有内层字段整个吞掉，
> 解析结果只剩 `{ xml: '...' }`。

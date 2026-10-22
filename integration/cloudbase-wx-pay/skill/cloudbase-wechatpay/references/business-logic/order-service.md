# orderService 数据库集成

> 基于 `pay-common/README.md` Step 6 + `orderService.js` 占位代码整理。
> pay-common 的 `services/orderService.js` 是一个**业务钩子层**，需要根据你的业务系统实现。

---

## 设计定位

```
pay-common 模板架构
┌─────────────────────────────────┐
│  routes/pay.js                  │  ← 路由分发（不动）
├─────────────────────────────────┤
│  services/payService.js          │  ← 支付核心逻辑（不动）
│  services/strategies/            │  ← 签名策略（不动）
│  services/orderService.js        │  ← ⭐ 你需要改这个文件
│  utils/validator.js              │  ← 参数校验（不动）
└─────────────────────────────────┘
         ↑ 需要你实现的业务逻辑
    ┌─────────────┐
    │ 你的数据库   │  (CloudBase DB / MongoDB / MySQL / ...)
    └─────────────┘
```

`orderService.js` 是 pay-common 与**你的业务系统之间的唯一桥梁**。

---

## 接口规范

### 必须实现的方法

```javascript
class OrderService {
  /**
   * 下单前金额核定（⭐ 必做，不实现 = 一律拒单）
   * @param {object} params - 下单参数（amount.total 来自客户端，不可信）
   * @returns {{ok: boolean, reason?: string}} 只有 { ok: true } 才放行
   */
  async verifyAmount(params) {}

  /**
   * 退款前可退金额核定（⭐ 必做，不实现 = 一律拒绝退款）
   * @param {object} params - 退款参数（amount.refund / amount.total 都来自客户端）
   * @returns {{ok: boolean, reason?: string}} 只有 { ok: true } 才放行
   */
  async verifyRefundAmount(params) {}

  /**
   * 查单 / 关单 / 退款 / 查退款 前的归属校验（⭐ 必做，不实现 = 403）
   * @param {object} params - out_trade_no / transaction_id / out_refund_no
   * @param {?object} identity - 登录身份 { openid, uid }
   * @returns {{ok: boolean, reason?: string}} 只有 { ok: true } 才放行
   */
  async verifyOrderOwner(params, identity) {}

  /**
   * 发起商家转账前的权限校验（⭐ 必做，不实现 = 403）
   * @param {object} params - 收款 openid / transfer_amount 都来自请求体
   * @param {?object} identity - 登录身份 { openid, uid }
   * @returns {{ok: boolean, reason?: string}} 只有 { ok: true } 才放行
   */
  async verifyTransferAllowed(params, identity) {}

  /**
   * 下单成功回调 - 写入待支付订单
   * @param {object} params - 下单参数（description, out_trade_no, amount, payer 等）
   * @param {?object} identity - 登录身份 { openid, uid }（来自鉴权中间件，三个下单入口都会传）
   * @returns {boolean} 是否成功
   * @throws {Error} resolveOwner 取不到合法归属标识时必须抛错，不要创建无主订单
   */
  async handlerUnified(params, identity) {}

  /**
   * 支付回调处理 - 更新订单状态为已支付
   * @param {object} params - 回调数据（out_trade_no, amount, transaction_id 等）
   * @returns {boolean} 是否成功
   */
  async handlerUnifiedTrigger(params) {}

  /**
   * 退款回调处理 - 更新订单退款状态
   * @param {object} params - 退款回调数据
   * @returns {boolean}
   */
  async handlerRefundTrigger(params) {}
}
```

---

## 金额钩子：默认拒绝（fail closed）

`verifyAmount` / `verifyRefundAmount` 模板默认 `return { ok: false }`，
调用方 `payService` **只认 `{ ok: true }`** —— 返回 `null` / `{ ok: false }` 都会在**调用微信之前**抛错中断。

| 现象 | 原因 |
|---|---|
| 下单返回 `400 订单金额校验失败：服务端未核定订单金额` | 预期行为：`verifyAmount` 还没实现 |
| 退款返回 `400 退款金额校验失败：服务端未核定可退金额` | 预期行为：`verifyRefundAmount` 还没实现 |

### 联调总开关：`PAY_GUARD=off`

还没有商品表 / 订单表时，开这**一个**开关就能把整条链路跑通 —— 它一次跳过全部 4 个钩子
（`verifyAmount` / `verifyRefundAmount` / `verifyOrderOwner` / `verifyTransferAllowed`）：

| 使用方式 | 加在哪 | 生效时机 |
|---|---|---|
| 集成中心创建云函数 → 下载 example 联调 | 控制台 → 函数管理 → `pay-common` → 函数配置 → 环境变量 | 保存即生效，无需重新部署 |
| example 代码 → CLI 部署 → 绑定后联调 | `cloudbaserc.json` → `functions[0].envVariables` | 部署时写入，改完需重新 deploy |
| 云托管 | 控制台 → 服务配置 → 环境变量 | 保存后重启实例 |
| 本地联调 | `npm run dev`（脚本已带 `PAY_GUARD=off`） | 启动即生效 |

> 🔒 **只有 `PAY_GUARD=off` 才放行**，其它任何值（含 `on`、不设、拼错）都按生产处理。
> `cloudbaserc.json` / `Dockerfile` 已预置 `PAY_GUARD=on`，部署后即使忘了改也保持拒绝。
>
> ⚠️ `off` 下金额与订单归属完全由客户端决定，**生产环境严禁使用**。

**上线前必须**：① 确认 `PAY_GUARD=on` ② 实现全部 4 个钩子并返回 `{ ok: true }`。

---

## 归属钩子：默认拒绝（fail closed）

鉴权中间件只回答「你是谁」，**不回答「这单是不是你的」**。下面这些接口在调微信之前都要过归属钩子，
默认 `{ ok: false }` → 返回 **403**，且**不会调用微信**：

| 接口 | 钩子 | 不校验的后果 |
|---|---|---|
| 查单（`out_trade_no` / `transaction_id`） | `verifyOrderOwner` | 拿别人的单号越权查单，批量遍历可探测订单是否存在与状态 |
| 关单 | `verifyOrderOwner` | 关掉别人还没支付的订单 |
| 退款 / 查退款 | `verifyOrderOwner` | 对别人的订单发起退款、查退款进度 |
| 商家转账 | `verifyTransferAllowed` | 收款 `openid` 与金额都由请求体决定 → 把商户余额转给任意人 |

```javascript
// 参考实现：接自己的订单表
async verifyOrderOwner(params, identity) {
  const owner = this.resolveOwner(params, identity);   // 只认登录身份
  if (!owner) return { ok: false, reason: '缺少登录身份' };

  const where = params.out_trade_no
    ? { out_trade_no: params.out_trade_no }
    : { transaction_id: params.transaction_id };
  const order = await db.collection('orders').where(where).get();
  if (!order.data?.length) return { ok: false, reason: '订单不存在' };
  if (order.data[0].owner !== owner) return { ok: false, reason: '订单不属于当前用户' };
  return { ok: true };
}

async verifyTransferAllowed(params, identity) {
  const operator = await db.collection('operators').where({ uid: identity?.uid }).get();
  if (!operator.data?.length) return { ok: false, reason: '无转账权限' };
  return { ok: true };
}
```

### 报错与联调

| 现象 | 原因 |
|---|---|
| `403 查单被拒绝：服务端未校验订单归属…` | 预期行为：`verifyOrderOwner` 还没实现 |
| `403 转账被拒绝：服务端未校验转账权限…` | 预期行为：`verifyTransferAllowed` 还没实现 |

联调用上面那**一个** `PAY_GUARD=off`，不额外区分金额与归属。
> ⚠️ `off` 下 = 任何登录用户都能操作别人的订单、把商户余额转给任意 openid。

**上线前必须**：① 确认 `PAY_GUARD=on` ② 实现 `verifyOrderOwner` / `verifyTransferAllowed`。

---

## CloudBase 数据库参考实现

### 方案一：使用 CloudBase SDK（推荐）

> 需要在 `cloudbaserc.json` 中配置数据库权限。

```javascript
// services/orderService.js
const tcb = require('@cloudbase/node-sdk')
const app = tcb.init({ env: process.env.TCB_ENV_ID || process.env.envId })
const db = app.database()
const _ = db.command

class OrderService {
  // 订单集合名
  static COLLECTION = 'orders'

  /**
   * Step 1: 下单成功 → 写入待支付订单
   */
  async handlerUnified(params, identity) {
    // 归属标识：只认登录身份 identity.openid → identity.uid，取不到就是无主订单
    // ⚠️ params.payer.openid 不再参与归属（请求体由客户端控制，可填别人的 openid）
    // resolveOwner 由模板 services/orderService.js 提供，自己实现时保留这个方法即可复用
    const owner = this.resolveOwner(params, identity)
    if (!owner) throw new Error('订单缺少归属身份，拒绝创建无主订单')

    try {
      const orderData = {
        out_trade_no: params.out_trade_no,          // 商户订单号
        description: params.description,             // 商品描述
        amount_total: params.amount.total,           // 订单金额（分）
        currency: params.amount.currency || 'CNY',   // 币种
        owner,                                       // ⭐ 订单归属（openid 或 uid），不要留空
        status: 'NOTPAY',                            // 初始状态：待支付
        created_at: new Date(),                      // 创建时间
        expire_at: new Date(Date.now() + 30 * 60 * 1000),  // 30 分钟过期
      }

      await db.collection(OrderService.COLLECTION).add(orderData)
      console.log(`[OrderService] 订单已创建: ${params.out_trade_no}`)
      return true
    } catch (e) {
      console.error('[OrderService] 创建订单失败:', e.message)
      return false
    }
  }

  /**
   * Step 2: 支付回调 → 幂等更新 + 校验金额 + 发货
   *
   * ⚠️ 核心要点：
   * 1. 先查状态 → 已支付则跳过（幂等）
   * 2. 校验金额 → 防止金额篡改
   * 3. 更新状态 → PAID
   * 4. 触发发货逻辑
   */
  async handlerUnifiedTrigger(params) {
    const outTradeNo = params.out_trade_no

    try {
      // 1️⃣ 幂等检查：先查询当前状态
      const existing = await db.collection(OrderService.COLLECTION)
        .where({ out_trade_no: outTradeNo })
        .get()

      if (!existing.data || existing.data.length === 0) {
        console.error(`[OrderService] 订单不存在: ${outTradeNo}`)
        return false
      }

      const order = existing.data[0]

      // 1.1 已支付 → 跳过，直接返回成功（幂等）
      if (order.status === 'PAID' || order.status === 'REFUND') {
        console.log(`[OrderService] 订单 ${outTradeNo} 状态已是 ${order.status}，跳过`)
        return true
      }

      // 2️⃣ 金额校验（防篡改）
      const callbackAmount = params.amount?.total
      if (callbackAmount && callbackAmount !== order.amount_total) {
        console.error(
          `[OrderService] 金额不一致! 订单=${order.amount_total}, 回调=${callbackAmount}`
        )
        // 不返回 false（否则微信会重试），而是记录异常并人工介入
        await this._logFraud(outTradeNo, order.amount_total, callbackAmount)
        return true  // 返回 true 让微信停止重试，但标记为异常
      }

      // 3️⃣ 更新订单状态（条件更新保证原子性）
      await db.collection(OrderService.COLLECTION)
        .where({
          out_trade_no: outTradeNo,
          status: _.in(['NOTPAY', 'USERPAYING']),     // 仅允许从这些状态变更
        })
        .update({
          status: 'PAID',
          transaction_id: params.transaction_id || '',
          paid_at: new Date(),
          updated_at: new Date(),
        })

      console.log(`[OrderService] 订单 ${outTradeNo} 已更新为 PAID`)

      // 4️⃣ 触发业务逻辑（异步不阻塞回调返回）
      this._onPaymentSuccess(order, params).catch(console.error)

      return true
    } catch (e) {
      console.error('[OrderService] 回调处理失败:', e.message)
      return false
    }
  }

  /**
   * 退款回调处理
   */
  async handlerRefundTrigger(params) {
    try {
      await db.collection(OrderService.COLLECTION)
        .where({ out_trade_no: params.out_trade_no })
        .update({
          status: 'REFUND',
          refund_id: params.refund_id || '',
          refund_amount: params.amount?.refund || 0,
          refund_status: params.refund_status || 'SUCCESS',
          updated_at: new Date(),
        })
      return true
    } catch (e) {
      console.error('[OrderService] 退款回调处理失败:', e.message)
      return false
    }
  }

  // ========== 私有方法 ==========

  /** 支付成功后触发（发货/发放权益等） */
  async _onPaymentSuccess(order, callbackData) {
    // TODO: 根据你的业务实现
    // 示例：
    // - 发送通知（短信/模板消息）
    // - 扣减库存
    // - 增加用户权益
    // - 写入流水日志
    console.log(`[OrderService] 支付成功，触发发货逻辑: ${order.out_trade_no}`)
  }

  /** 记录金额异常（安全审计） */
  async _logFraud(outTradeNo, expectedAmount, actualAmount) {
    // TODO: 写入审计表 / 发送告警
    console.error(
      `[FRAUD] 金额异常! out_trade_no=${outTradeNo}, expected=${expectedAmount}, actual=${actualAmount}`
    )
  }

  /** 定时关单（超时未支付的订单） */
  async closeExpiredOrders() {
    const result = await db.collection(OrderService.COLLECTION)
      .where({
        status: 'NOTPAY',
        expire_at: _.lt(new Date()),
      })
      .update({ status: 'CLOSED', closed_reason: '超时自动关闭' })

    console.log(`[OrderService] 关闭了 ${result.updated} 个超时订单`)
    return result.updated
  }
}

module.exports = { OrderService }
```

### 方案二：自建 MySQL / 其他数据库

如果你不用 CloudBase 数据库：

```javascript
// services/orderService.js - 自建 DB 版本示例
const mysql = require('mysql2/promise')

class OrderService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    })
  }

  async handlerUnified(params, identity) {
    // 同上：resolveOwner 由模板提供；只认 identity，别拿 params.payer?.openid 当归属
    const owner = this.resolveOwner(params, identity)
    if (!owner) throw new Error('订单缺少归属身份，拒绝创建无主订单')

    const conn = await this.pool.getConnection()
    try {
      await conn.execute(
        `INSERT INTO orders (out_trade_no, description, amount, owner, status, created_at)
         VALUES (?, ?, ?, ?, 'NOTPAY', NOW())`,
        [params.out_trade_no, params.description, params.amount.total, owner]
      )
      return true
    } finally {
      conn.release()
    }
  }

  async handlerUnifiedTrigger(params) {
    const conn = await this.pool.getConnection()
    try {
      // 幂等：SELECT FOR UPDATE 锁行
      const [rows] = await conn.execute(
        `SELECT * FROM orders WHERE out_trade_no = ? FOR UPDATE`,
        [params.out_trade_no]
      )

      const order = rows[0]
      if (!order) return false
      if (order.status === 'PAID') return true  // 幂等

      // 金额校验
      if (params.amount?.total && Number(params.amount.total) !== Number(order.amount)) {
        // 记录审计
        return true
      }

      await conn.execute(
        `UPDATE orders SET status='PAID', transaction_id=?, paid_at=NOW()
         WHERE out_trade_no=? AND status IN ('NOTPAY','USERPAYING')`,
        [params.transaction_id, params.out_trade_no]
      )

      return true
    } finally {
      conn.release()
    }
  }

  async handlerRefundTrigger(params) {
    const conn = await this.pool.getConnection()
    try {
      await conn.execute(
        `UPDATE orders SET status='REFUND', refund_status=?, updated_at=NOW()
         WHERE out_trade_no=?`,
        [params.refund_status || 'SUCCESS', params.out_trade_no]
      )
      return true
    } finally {
      conn.release()
    }
  }
}
```

---

## 订单状态机

```
                    下单成功
                       │
                       ▼
                   ┌───────┐
                   │ NOTPAY │ ← 初始状态
                   └───┬───┘
           ┌───────────┼───────────┐
           ▼           ▼           ▼
       ┌───────┐  ┌────────┐  ┌───────┐
       │ PAID  │  │ CLOSED │  │EXPIRED│
       └───┬───┘  └────────┘  └───────┘
           │
           ▼
       ┌────────┐
       │ REFUND │
       └────────┘
```

| 状态 | 含义 | 触发条件 |
|------|------|---------|
| `NOTPAY` | 待支付 | 下单创建时 |
| `USERPAYING` | 支付中 | （可选）付款码支付中间态 |
| **`PAID`** | **已支付** | **收到支付回调且校验通过** |
| `CLOSED` | 已关闭 | 主动关闭 / 超时自动关闭 |
| `EXPIRED` | 已过期 | 超过有效期未支付 |
| `REFUND` | 已退款 | 收到退款回调 |

---

## 安全红线

在实现 `handlerUnifiedTrigger` 时，必须遵守以下规则：

| # | 规则 | 违反后果 |
|---|------|---------|
| 1 | **必须幂等** | 同一订单的重复回调会导致重复发货 |
| 2 | **必须校验金额** | 可能被篡改为 0.01 分 |
| 3 | **先查后改**（条件更新） | 防止并发竞态 |
| 4 | **不要在回调中做耗时操作** | 超 5 秒微信会重试 |
| 5 | **记录完整审计日志** | 出问题时无法追溯 |
| 6 | **异常订单走人工流程** | 不要自动处理可疑订单 |

---

*商家转账见 [transfer.md](transfer.md) | 上线清单见 [security-checklist.md](security-checklist.md)*

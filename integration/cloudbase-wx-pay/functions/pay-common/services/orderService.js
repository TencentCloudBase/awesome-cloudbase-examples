/**
 * 订单服务（业务钩子）
 *
 * ════════════════════════════════════════════════════════
 * ⚠️  【重要】这是模板的业务占位层 —— 所有方法都是空壳实现
 *
 *   上线前你【必须】在这里接入自己的数据库操作！
 *   每个方法体内都有明确的 TODO 标注和参数说明，
 *   请根据你的数据库选型（MySQL / MongoDB / CloudBase 数据库 等）
 *   替换 console.log 为实际的 CRUD 操作。
 * ════════════════════════════════════════════════════════
 *
 * 关键提醒：
 * 1. handlerUnifiedTrigger 和 handlerRefundTrigger 是回调处理方法，
 *    同一笔订单可能收到多次回调（微信支付重试机制），必须做幂等检查。
 * 2. 幂等检查方法：查询订单状态，如果已是"已支付"状态，直接跳过，不重复处理。
 * 3. 回调中应核验支付金额与下单金额是否一致（防篡改）。
 */

const { normalizeOpenId, normalizeUid } = require('../utils/cloudbaseAuth');

/**
 * 解析订单归属标识（唯一权威入口：controller / service / 落库都只认这一份口径）
 *
 * 优先 identity.openid，其次 identity.uid，最后才是 params.payer.openid。
 * 每个候选值都要过格式校验（复用 cloudbaseAuth 的 openid / uid 正则），
 * 挡住非字符串、空串、超长值和特殊字符，避免把脏数据写成归属标识。
 *
 * 🚨 取不到合法标识时返回 null，**调用方必须按失败处理**：
 *    不能用 null 当「未知」写进归属字段 —— null 会参与下游的相等比对
 *    （查单 / 退款归属校验），退化成 { owner: null } 后可能命中其他同样
 *    缺失归属的历史订单，导致越权查单 / 退款。
 *
 * @param {Object} params - 下单参数
 * @param {Object|null} [identity] - 登录身份 { openid, uid }
 * @returns {string|null} 合法的归属标识，取不到返回 null
 */
function resolveOwner(params, identity) {
    const candidates = [
        { value: identity?.openid, kind: 'identity.openid', normalize: normalizeOpenId },
        { value: identity?.uid, kind: 'identity.uid', normalize: normalizeUid },
        // 客户端可填，controller 已用登录身份覆盖；仍然过一遍格式校验，防止污染落库
        { value: params?.payer?.openid, kind: 'params.payer.openid', normalize: normalizeOpenId },
    ];

    for (const candidate of candidates) {
        if (candidate.value === undefined || candidate.value === null) continue;
        const normalized = candidate.normalize(candidate.value);
        if (normalized) return normalized;
        console.warn('[OrderService] 归属候选值格式非法，已丢弃:', candidate.kind, typeof candidate.value);
    }

    return null;
}

class OrderService {
    constructor() {}

    // ========== 金额校验钩子（模板默认放行，上线前必须实现）==========

    /**
     * 下单前校验订单金额
     *
     * 🚨 普通微信支付按**请求金额**收款，微信不核对商品到底值多少钱。
     *    模板里 `amount.total` 由客户端传，请求体写 `amount: { total: 1 }`
     *    就是一笔 1 分钱订单，付完回调照样是 SUCCESS —— 这是模板最大的业务风险。
     *
     * 接入数据库后在这里实现（返回 `{ ok: false, reason }` 会直接拒绝下单）：
     *
     * ```js
     * async verifyAmount(params) {
     *     const product = await db.collection('products').doc(params.product_id).get();
     *     if (!product) return { ok: false, reason: '商品不存在' };
     *     const expected = product.price * (params.quantity || 1);
     *     if (params.amount?.total !== expected) {
     *         return { ok: false, reason: `amount.total 应为 ${expected} 分` };
     *     }
     *     return { ok: true };
     * }
     * ```
     *
     * 更彻底的做法是下单接口只收 `product_id` + `quantity`，金额完全由服务端算，
     * 客户端连传 `amount` 的机会都没有。
     *
     * @param {Object} params - 下单参数（amount.total 来自客户端，不可信）
     * @returns {Promise<{ok: boolean, reason?: string}>|null} 返回 null/undefined = 不校验
     */
    async verifyAmount(params) {
        // TODO: 按 product_id 查真实价格并与 params.amount.total 比对
        console.warn('[OrderService] verifyAmount 未实现，当前不校验订单金额:', params?.out_trade_no);
        return null;
    }

    /**
     * 退款前校验退款金额上限
     *
     * `validateRefundParams` 只检查 `amount.refund <= amount.total`，
     * 而这两个数都来自请求体 —— 改成 `{ refund: 999999, total: 999999 }` 就绕过了。
     * 正确做法是以**落库订单金额 / 已退金额**为上限。
     *
     * @param {Object} params - 退款参数
     * @returns {Promise<{ok: boolean, reason?: string}>|null} 返回 null/undefined = 不校验
     */
    async verifyRefundAmount(params) {
        // TODO: 查落库订单，校验 params.amount.refund <= 订单可退金额
        console.warn('[OrderService] verifyRefundAmount 未实现，当前不校验退款上限:', params?.out_refund_no);
        return null;
    }

    /**
     * 下单成功后创建/记录订单
     *
     * ⚠️ 订单归属：优先用 `identity.openid`，没有 openid 时**必须**用 `identity.uid`。
     *    H5（微信外浏览器）用 CloudBase Auth 登录时凭证里只有 UID、没有微信 openid，
     *    此时若只按 openid 落库，订单会丢失归属，后续查单 / 退款的归属校验全部失效。
     *
     * @param {Object} params - 下单参数
     * @param {string} params.out_trade_no - 商户订单号
     * @param {string} params.description - 商品描述
     * @param {Object} params.amount - 订单金额 { total, currency }
     * @param {Object} [params.payer] - 支付者信息 { openid }
     * @param {Object|null} [identity] - 登录身份 { openid, uid }（来自鉴权中间件）
     * @returns {boolean}
     * @throws {Error} 取不到合法归属标识时抛错，拒绝创建无主订单
     */
    async handlerUnified(params, identity = null) {
        // TODO: 插入订单到数据库，归属字段直接用下面的 owner（不要再自己拼一遍）
        const owner = this.resolveOwner(params, identity);
        if (!owner) {
            console.error('[OrderService] handlerUnified - 订单缺少归属身份，拒绝创建无主订单:', params?.out_trade_no);
            throw new Error('订单缺少归属身份：identity.openid / identity.uid 均为空，无法落库归属');
        }
        console.info('[OrderService] handlerUnified - 订单创建:', params.out_trade_no, '归属:', owner);
        return true;
    }

    /**
     * 订单归属解析（供 service 层下单前预检复用，口径同 handlerUnified）
     * @param {Object} params - 下单参数
     * @param {Object|null} [identity] - 登录身份 { openid, uid }
     * @returns {string|null}
     */
    resolveOwner(params, identity = null) {
        return resolveOwner(params, identity);
    }

    /**
     * 支付回调 - 更新订单状态为已支付
     *
     * ⚠️ 必须实现幂等：
     *   1. 先查询订单状态
     *   2. 如果已是"已支付"，直接返回 true（跳过）
     *   3. 如果是"待支付"，更新为"已支付"，执行发货等业务
     *   4. 校验 params.amount.total 与下单时的金额是否一致
     *
     * @param {Object} params - 微信支付回调解密后的明文
     * @param {string} params.out_trade_no - 商户订单号
     * @param {string} params.transaction_id - 微信支付订单号
     * @param {string} params.trade_state - 交易状态 (SUCCESS/REFUND/NOTPAY/CLOSED 等)
     * @param {string} params.trade_type - 交易类型 (JSAPI/NATIVE/APP/MWEB)
     * @param {Object} params.amount - 金额 { total, payer_total, currency }
     * @param {Object} params.payer - 支付者 { openid }
     * @returns {boolean}
     */
    async handlerUnifiedTrigger(params) {
        // TODO: 幂等检查 + 更新订单 + 发货
        console.info('[OrderService] handlerUnifiedTrigger - 支付结果:', params.out_trade_no, params.trade_state);
        return true;
    }

    /**
     * 退款申请成功后更新订单状态
     * @param {Object} params - 退款请求参数
     * @param {string} params.out_trade_no - 商户订单号
     * @param {string} params.out_refund_no - 商户退款单号
     * @param {Object} params.amount - 金额 { total, refund }
     * @returns {boolean}
     */
    async handlerRefund(params) {
        // TODO: 更新订单状态为"退款中"
        console.info('[OrderService] handlerRefund - 退款申请:', params.out_refund_no);
        return true;
    }

    /**
     * 退款回调 - 更新退款结果
     *
     * ⚠️ 必须实现幂等（同 handlerUnifiedTrigger）
     *
     * @param {Object} params - 微信退款回调解密后的明文
     * @param {string} params.out_trade_no - 商户订单号
     * @param {string} params.out_refund_no - 商户退款单号
     * @param {string} params.transaction_id - 微信支付订单号
     * @param {string} params.refund_id - 微信退款单号
     * @param {string} params.refund_status - 退款状态 (SUCCESS/CHANGE/REFUNDCLOSE)
     * @param {Object} params.amount - 金额 { total, refund, payer_total, payer_refund }
     * @returns {boolean}
     */
    async handlerRefundTrigger(params) {
        // TODO: 幂等检查 + 更新退款状态
        console.info('[OrderService] handlerRefundTrigger - 退款结果:', params.out_refund_no, params.refund_status);
        return true;
    }

    // ========== 商家转账 ==========

    /**
     * 转账受理成功后记录转账单信息（升级版 - 单笔模式）
     * @param {Object} params - 转账请求参数
     * @param {string} params.out_bill_no - 商户转账单号
     * @param {number} params.transfer_amount - 转账金额（分）
     * @param {string} params.openid - 收款用户 openid
     * @param {Object} result - 微信返回结果 { transfer_bill_no, out_bill_no, create_time, state }
     * @returns {boolean}
     */
    async handlerTransfer(params, result) {
        // TODO: 记录转账单到数据库
        console.info('[OrderService] handlerTransfer - 转账受理:', params.out_bill_no, 'transfer_bill_no:', result.transfer_bill_no);
        return true;
    }

    /**
     * 商家转账回调 - 更新转账结果（升级版 - 单笔模式）
     *
     * ⚠️ 必须实现幂等：
     *   1. 先查询转账单状态
     *   2. 如果已处理，直接返回 true
     *   3. 根据 state 更新（SUCCESS/FAIL/...）
     *
     * @param {Object} params - 转账回调解密后的明文
     * @param {string} params.mchid - 商户号
     * @param {string} params.out_bill_no - 商户转账单号
     * @param {string} params.transfer_bill_no - 微信转账单号
     * @param {string} params.state - 转账状态 (SUCCESS/FAIL 等)
     * @returns {boolean}
     */
    async handlerTransferTrigger(params) {
        // TODO: 幂等检查 + 更新转账单状态
        console.info('[OrderService] handlerTransferTrigger - 转账结果:', params.out_bill_no, params.state);
        return true;
    }
}

module.exports = OrderService;

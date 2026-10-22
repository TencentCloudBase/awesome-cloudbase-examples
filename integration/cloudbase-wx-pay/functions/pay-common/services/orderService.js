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
const { insecureDemo } = require('../config/config');

/**
 * 解析订单归属标识（唯一权威入口：controller / service / 落库都只认这一份口径）
 *
 * 只认登录身份：优先 identity.openid，其次 identity.uid。
 * 每个候选值都要过格式校验（复用 cloudbaseAuth 的 openid / uid 正则），
 * 挡住非字符串、空串、超长值和特殊字符，避免把脏数据写成归属标识。
 *
 * 🚨 第三候选 `params.payer.openid` **已删除**：
 *    请求体由客户端完全控制，拿它当归属等于「谁都能把订单记到别人名下」，
 *    而归属又是后续查单 / 退款 / 关单授权的唯一依据。
 *    `params` 参数保留只是为了不改变既有调用签名（controller / service 都传两个），
 *    **不再从里面读任何身份字段**。
 *
 * 🚨 取不到合法标识时返回 null，**调用方必须按失败处理**：
 *    不能用 null 当「未知」写进归属字段 —— null 会参与下游的相等比对
 *    （查单 / 退款归属校验），退化成 { owner: null } 后可能命中其他同样
 *    缺失归属的历史订单，导致越权查单 / 退款。
 *
 * @param {Object} params - 下单参数（仅保留签名，不参与归属解析）
 * @param {Object|null} [identity] - 登录身份 { openid, uid }（唯一归属来源）
 * @returns {string|null} 合法的归属标识，取不到返回 null
 */
function resolveOwner(params, identity) {
    const candidates = [
        { value: identity?.openid, kind: 'identity.openid', normalize: normalizeOpenId },
        { value: identity?.uid, kind: 'identity.uid', normalize: normalizeUid },
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
     * 🚨 因此本方法**默认拒绝下单（fail closed）**，而不是返回 null 静默放行：
     *    返回 null 时调用方判定为「不校验」并继续调微信下单，
     *    等于把收款金额的决定权交给客户端，对每一笔订单 100% 生效。
     *
     * 接入数据库后在这里实现（返回 `{ ok: true }` 才放行）：
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
     * 联调（还没接商品表）可设 `PAY_GUARD=off` 放行，生产环境严禁开启。
     *
     * @param {Object} params - 下单参数（amount.total 来自客户端，不可信）
     * @returns {Promise<{ok: boolean, reason?: string}>} 只有 { ok: true } 才放行
     */
    async verifyAmount(params) {
        if (insecureDemo) {
            console.warn(
                '[OrderService] ⚠️ PAY_GUARD=off，本次跳过订单金额校验：',
                params?.out_trade_no, 'amount.total =', params?.amount?.total, '（由客户端决定）'
            );
            return { ok: true };
        }

        return {
            ok: false,
            reason: '服务端未核定订单金额（orderService.verifyAmount 未实现）：'
                + '请接入商品表后按 product_id 查真实价格并与 amount.total 比对，通过时返回 { ok: true }；'
                + '本地联调可设 PAY_GUARD=off（npm run dev 已自动设置），详见 README「联调开关」',
        };
    }

    /**
     * 退款前校验退款金额上限
     *
     * `validateRefundParams` 只检查 `amount.refund <= amount.total`，
     * 而这两个数都来自请求体 —— 改成 `{ refund: 999999, total: 999999 }` 就绕过了。
     * 正确做法是以**落库订单金额 / 已退金额**为上限。
     *
     * 🚨 同样**默认拒绝退款（fail closed）**：返回 null 会被调用方当成「不校验」
     *    并继续发起微信退款，等于允许按客户端指定的任意金额多退。
     *
     * 接入数据库后在这里实现（返回 `{ ok: true }` 才放行）：
     *
     * ```js
     * async verifyRefundAmount(params) {
     *     const order = await db.collection('orders').doc(params.out_trade_no).get();
     *     if (!order) return { ok: false, reason: '订单不存在' };
     *     const refundable = order.amount.total - (order.amount.refunded || 0);
     *     if (params.amount.refund > refundable) {
     *         return { ok: false, reason: `最多可退 ${refundable} 分` };
     *     }
     *     return { ok: true };
     * }
     * ```
     *
     * 本地联调（无订单库）可设 `PAY_GUARD=off` 临时放行，生产环境严禁开启。
     *
     * @param {Object} params - 退款参数
     * @returns {Promise<{ok: boolean, reason?: string}>} 只有 { ok: true } 才放行
     */
    async verifyRefundAmount(params) {
        if (insecureDemo) {
            console.warn(
                '[OrderService] ⚠️ PAY_GUARD=off，本次跳过退款上限校验：',
                params?.out_refund_no, 'amount.refund =', params?.amount?.refund, '（由客户端决定）'
            );
            return { ok: true };
        }

        return {
            ok: false,
            reason: '服务端未核定可退金额（orderService.verifyRefundAmount 未实现）：'
                + '请接入订单表后按「订单金额 - 已退金额」校验 params.amount.refund，通过时返回 { ok: true }；'
                + '本地联调可设 PAY_GUARD=off（npm run dev 已自动设置），详见 README「联调开关」',
        };
    }

    /**
     * 查单 / 关单 / 退款 / 查退款前的归属校验
     *
     * 🚨 鉴权只回答「你是谁」，不回答「这单是不是你的」：
     *    不校验归属时，任何一个已登录用户拿别人的 `out_trade_no` 就能：
     *      - 查单 / 查退款（越权读，批量遍历还能探测订单是否存在与状态）
     *      - 关掉别人还没支付的订单
     *      - 对别人的订单发起退款
     *    而这些接口在此之前只挂了鉴权中间件，对每一笔请求 100% 放行。
     *
     * 🚨 默认**拒绝**（fail closed）：模板没有订单表，无法回答归属问题。
     *
     * 接入数据库后（返回 `{ ok: true }` 才放行）：
     *
     * ```js
     * async verifyOrderOwner(params, identity) {
     *     const owner = resolveOwner(params, identity);       // 复用模板的归属解析
     *     if (!owner) return { ok: false, reason: '缺少登录身份' };
     *
     *     // transaction_id 场景没有 out_trade_no，按微信单号反查本地订单
     *     const where = params.out_trade_no
     *         ? { out_trade_no: params.out_trade_no }
     *         : { transaction_id: params.transaction_id };
     *     const order = await db.collection('orders').where(where).get();
     *     if (!order.data.length) return { ok: false, reason: '订单不存在' };
     *     if (order.data[0].owner !== owner) return { ok: false, reason: '订单不属于当前用户' };
     *
     *     // 退款额外：可退金额上限（订单金额 - 已退金额）
     *     return { ok: true };
     * }
     * ```
     *
     * 联调（还没有订单表）可设 `PAY_GUARD=off` 临时放行，生产环境严禁开启。
     *
     * @param {Object} params - 请求参数（out_trade_no / transaction_id / out_refund_no）
     * @param {Object|null} identity - 登录身份 { openid, uid }
     * @returns {Promise<{ok: boolean, reason?: string}>} 只有 { ok: true } 才放行
     */
    async verifyOrderOwner(params, identity) {
        if (insecureDemo) {
            console.warn(
                '[OrderService] ⚠️ PAY_GUARD=off，本次跳过订单归属校验：',
                params?.out_trade_no || params?.transaction_id || params?.out_refund_no || '(无单号)'
            );
            return { ok: true };
        }

        return {
            ok: false,
            reason: '服务端未校验订单归属（orderService.verifyOrderOwner 未实现）：'
                + '请接入订单表后按 out_trade_no / transaction_id 查订单，比对 owner 与当前登录身份，'
                + '通过时返回 { ok: true }；'
                + '本地联调可设 PAY_GUARD=off（npm run dev 已自动设置），详见 README「联调开关」',
        };
    }

    /**
     * 发起商家转账前的权限校验
     *
     * 🚨 `/wxpay_transfer` 的收款人 `openid` 与 `transfer_amount` 都来自请求体，
     *    此前只校验「已登录」—— 任何用户都能把商户余额转到自己或任意 openid。
     *    商家转账本质是**后台/运营接口**，必须自己判断调用者是否有这个权限。
     *
     * 接入自有权限体系后（返回 `{ ok: true }` 才放行）：
     *
     * ```js
     * async verifyTransferAllowed(params, identity) {
     *     const operator = await db.collection('operators').where({ uid: identity?.uid }).get();
     *     if (!operator.data.length) return { ok: false, reason: '无转账权限' };
     *     // 可选：限定单笔上限、限定收款人白名单
     *     return { ok: true };
     * }
     * ```
     *
     * 联调可设 `PAY_GUARD=off` 临时放行，生产环境严禁开启。
     *
     * @param {Object} params - 转账参数（openid / transfer_amount 均来自请求体）
     * @param {Object|null} identity - 登录身份 { openid, uid }
     * @returns {Promise<{ok: boolean, reason?: string}>} 只有 { ok: true } 才放行
     */
    async verifyTransferAllowed(params, identity) {
        if (insecureDemo) {
            console.warn(
                '[OrderService] ⚠️ PAY_GUARD=off，本次跳过转账权限校验：',
                '收款 openid =', params?.openid, '金额 =', params?.transfer_amount
            );
            return { ok: true };
        }

        return {
            ok: false,
            reason: '服务端未校验转账权限（orderService.verifyTransferAllowed 未实现）：'
                + '商家转账的收款人 openid 与金额都来自请求体，必须由业务侧判断调用者权限，'
                + '通过时返回 { ok: true }；'
                + '本地联调可设 PAY_GUARD=off（npm run dev 已自动设置），详见 README「联调开关」',
        };
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

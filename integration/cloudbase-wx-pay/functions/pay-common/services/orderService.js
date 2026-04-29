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

class OrderService {
    constructor() {}

    /**
     * 下单成功后创建/记录订单
     * @param {Object} params - 下单参数
     * @param {string} params.out_trade_no - 商户订单号
     * @param {string} params.description - 商品描述
     * @param {Object} params.amount - 订单金额 { total, currency }
     * @param {Object} [params.payer] - 支付者信息 { openid }
     * @returns {boolean}
     */
    async handlerUnified(params) {
        // TODO: 插入订单到数据库
        console.info('[OrderService] handlerUnified - 订单创建:', params.out_trade_no);
        return true;
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

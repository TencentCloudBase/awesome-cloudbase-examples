/**
 * 支付控制器
 * 处理路由请求，调用 payService，返回统一格式
 */
const PayService = require('../services/payService');
const config = require('../config/config');
const { validateOrderParams, validateRefundParams, validateTransferParams } = require('../utils/validator');
const { getOpenId } = require('../utils/cloudbaseAuth');
const payService = new PayService();

// ========== 统一响应格式 ==========

function success(res, data) {
    res.status(200).json({ code: 0, msg: 'success', data });
}

function fail(res, msg, statusCode = 400) {
    res.status(statusCode).json({ code: -1, msg, data: null });
}

// ========== 下单 ==========

/**
 * 微信支付 - JSAPI/小程序下单
 */
exports.unifiedOrder = async (req, res) => {
    try {
        // 自动注入 payer.openid（如果前端没传，从 JWT / x-wx-openid header 中解析）
        if (!req.body.payer?.openid) {
            const openid = getOpenId(req);
            if (openid) {
                req.body.payer = { ...req.body.payer, openid };
                console.info('[Controller] 自动注入 payer.openid:', openid);
            }
        }

        const errors = validateOrderParams(req.body);
        if (errors.length > 0) return fail(res, errors.join('; '));

        const result = await payService.unifiedOrder(req.body, 'jsapi');
        success(res, result);
    } catch (err) {
        console.error('[Controller] unifiedOrder error:', err);
        fail(res, err.message || '下单失败');
    }
};

/**
 * 微信支付 - H5 下单
 */
exports.unifiedOrderH5 = async (req, res) => {
    try {
        const errors = validateOrderParams(req.body);
        if (errors.length > 0) return fail(res, errors.join('; '));

        const result = await payService.unifiedOrder(req.body, 'h5');
        success(res, result);
    } catch (err) {
        console.error('[Controller] unifiedOrderH5 error:', err);
        fail(res, err.message || 'H5 下单失败');
    }
};

/**
 * 微信支付 - Native 扫码下单
 */
exports.unifiedOrderNative = async (req, res) => {
    try {
        const errors = validateOrderParams(req.body);
        if (errors.length > 0) return fail(res, errors.join('; '));

        const result = await payService.unifiedOrder(req.body, 'native');
        success(res, result);
    } catch (err) {
        console.error('[Controller] unifiedOrderNative error:', err);
        fail(res, err.message || 'Native 下单失败');
    }
};

// ========== 查询 ==========

/**
 * 微信支付 - 通过商户订单号查询订单
 */
exports.queryOrderByOutTradeNo = async (req, res) => {
    try {
        if (!req.body.out_trade_no) return fail(res, 'out_trade_no 必填');
        const result = await payService.queryOrderByOutTradeNo(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] queryOrderByOutTradeNo error:', err);
        fail(res, err.message || '查单失败');
    }
};

/**
 * 微信支付 - 通过微信订单号查询订单
 */
exports.queryOrderByTransactionId = async (req, res) => {
    try {
        if (!req.body.transaction_id) return fail(res, 'transaction_id 必填');
        const result = await payService.queryOrderByTransactionId(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] queryOrderByTransactionId error:', err);
        fail(res, err.message || '查单失败');
    }
};

// ========== 关闭订单 ==========

/**
 * 微信支付 - 关闭订单
 */
exports.closeOrder = async (req, res) => {
    try {
        if (!req.body.out_trade_no) return fail(res, 'out_trade_no 必填');
        const result = await payService.closeOrder(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] closeOrder error:', err);
        fail(res, err.message || '关闭订单失败');
    }
};

// ========== 退款 ==========

/**
 * 微信支付 - 退款
 */
exports.refund = async (req, res) => {
    try {
        const errors = validateRefundParams(req.body);
        if (errors.length > 0) return fail(res, errors.join('; '));

        const result = await payService.refund(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] refund error:', err);
        fail(res, err.message || '退款失败');
    }
};

/**
 * 微信支付 - 查询退款
 */
exports.queryRefund = async (req, res) => {
    try {
        if (!req.body.out_refund_no) return fail(res, 'out_refund_no 必填');
        const result = await payService.queryRefund(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] queryRefund error:', err);
        fail(res, err.message || '退款查询失败');
    }
};

// ========== 回调通知 ==========

/**
 * 回调通知公共处理
 * 解析 body.ParsedContent（集成中心解密明文）→ 构造 callbackParams → 调用对应 service 方法 → 统一应答
 * @param {Object} req
 * @param {Object} res
 * @param {Function} handlerFn - payService 上的回调处理方法
 * @param {string} triggerName - 日志标识
 */
async function _handleCallback(req, res, handlerFn, triggerName) {
    try {
        const headers = req.headers;

        // 回调日志脱敏：只打印关键标识，避免泄露签名和密文
        console.log(`[Controller] ${triggerName} 回调:`, {
            timestamp: headers['wechatpay-timestamp'],
            serial: headers['wechatpay-serial'],
            event_type: req.body?.event_type
                     || req.body?.rawData?.event_type
                     || req.body?.ParsedNotify?.event_type,
            has_ciphertext: !!req.body?.resource?.ciphertext,
            is_integration: !!req.body?.ParsedContent,
        });

        // 集成中心网关模式：解密后明文在 body.ParsedContent
        // SDK 模式：body 不含 ParsedContent，decryptedData 为 null，下游会走自验签 + 解密
        const decryptedData = req.body?.ParsedContent || null;

        const callbackParams = {
            body: req.body,
            rawBody: req.rawBody,
            decryptedData,
            signature: headers['wechatpay-signature'],
            serial: headers['wechatpay-serial'],
            nonce: headers['wechatpay-nonce'],
            timestamp: headers['wechatpay-timestamp'],
        };

        const result = await handlerFn.call(payService, callbackParams);

        if (result) {
            res.status(200).json({ code: 'SUCCESS', message: '成功' });
        } else {
            res.status(400).json({ code: 'FAIL', message: '验签失败' });
        }
    } catch (err) {
        console.error(`[Controller] ${triggerName} error:`, err);
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
    }
}

/**
 * 微信支付 - 支付回调通知
 * SDK 模式：微信支付直接回调，需自己验签解密
 * 网关模式（集成中心）：网关已验签解密，明文在 header 中
 */
exports.unifiedOrderTrigger = (req, res) => _handleCallback(req, res, payService.handlePayCallback, 'unifiedOrderTrigger');

/**
 * 微信支付 - 退款回调通知
 */
exports.refundTrigger = (req, res) => _handleCallback(req, res, payService.handleRefundCallback, 'refundTrigger');

// ========== 商家转账 ==========

/**
 * 微信支付 - 发起商家转账（升级版 - 单笔模式）
 * 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012716434
 *
 * ⚠️ 注意：
 * 1. 受理成功 ≠ 转账成功，必须查单或等回调确认最终状态
 * 2. 转账金额 < 0.3元不填 user_name，≥ 2000元必填（需加密）
 * 3. SYSTEM_ERROR/ACCEPTED/频率超限 → 必须用相同参数+相同单号重试，禁止换单
 * 4. 同一单号重试期为 3 个自然日，超期需换新单号
 * 5. 用户 24 小时内未确认收款，系统自动关单退款（实际关单时间可能略超 24 小时）
 */
exports.transfer = async (req, res) => {
    try {
        // 自动注入 openid（如果前端没传，从 JWT / x-wx-openid header 中解析）
        if (!req.body.openid) {
            const openid = getOpenId(req);
            if (openid) {
                req.body.openid = openid;
                console.info('[Controller] 转账自动注入 openid:', openid);
            }
        }

        const errors = validateTransferParams(req.body);
        if (errors.length > 0) return fail(res, errors.join('; '));

        const result = await payService.transfer(req.body);
        // 把 mchId 注入 result.data 中透传给前端（wx.requestMerchantTransfer 需要）
        if (result && result.data) {
            result.data.mchId = config.payConfig.mchId;
        }
        success(res, result);
    } catch (err) {
        console.error('[Controller] transfer error:', err);
        fail(res, err.message || '商家转账失败');
    }
};

/**
 * 微信支付 - 商户单号查询转账单（升级版）
 */
exports.queryTransferBill = async (req, res) => {
    try {
        if (!req.body.out_bill_no) return fail(res, 'out_bill_no（商户单号）必填');
        const result = await payService.queryTransferBill(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] queryTransferBill error:', err);
        fail(res, err.message || '查询转账单失败');
    }
};

/**
 * 微信支付 - 微信单号查询转账单（升级版）
 */
exports.queryTransferBillByNo = async (req, res) => {
    try {
        if (!req.body.transfer_bill_no) return fail(res, 'transfer_bill_no（微信转账单号）必填');
        const result = await payService.queryTransferBillByNo(req.body);
        success(res, result);
    } catch (err) {
        console.error('[Controller] queryTransferBillByNo error:', err);
        fail(res, err.message || '查询转账单失败');
    }
};

/**
 * 微信支付 - 商家转账回调通知
 */
exports.transferTrigger = (req, res) => _handleCallback(req, res, payService.handleTransferCallback, 'transferTrigger');

// ========== 鉴权中间件 ==========
//
// 实现在 middleware/auth.js：独立文件，不依赖 service → wechatpay-node-v3，
// 便于单独跑鉴权回归测试。

const { payMiddleware, h5SecurityMiddleware } = require('../middleware/auth');

exports.payMiddleware = payMiddleware;
exports.h5SecurityMiddleware = h5SecurityMiddleware;



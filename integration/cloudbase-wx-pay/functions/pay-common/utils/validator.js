/**
 * 参数校验工具
 */

/**
 * 校验下单参数
 */
function validateOrderParams(body) {
    const errors = [];

    if (!body.description || typeof body.description !== 'string') {
        errors.push('description（商品描述）必填');
    } else if (body.description.length > 127) {
        errors.push('description（商品描述）不能超过 127 个字符');
    }

    if (!body.amount || !body.amount.total) {
        errors.push('amount.total（订单金额）必填');
    } else if (!Number.isInteger(body.amount.total) || body.amount.total <= 0) {
        errors.push('amount.total（订单金额）必须为正整数（单位：分）');
    }

    if (body.out_trade_no) {
        if (typeof body.out_trade_no !== 'string' || body.out_trade_no.length < 6 || body.out_trade_no.length > 32) {
            errors.push('out_trade_no（商户订单号）长度必须 6-32 位');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(body.out_trade_no)) {
            errors.push('out_trade_no（商户订单号）只能包含字母、数字、下划线、连字符');
        }
    }

    return errors;
}

/**
 * 校验退款参数
 */
function validateRefundParams(body) {
    const errors = [];

    if (!body.out_trade_no && !body.transaction_id) {
        errors.push('out_trade_no 或 transaction_id 至少填一个');
    }

    if (!body.out_refund_no) {
        errors.push('out_refund_no（商户退款单号）必填');
    }

    if (!body.amount) {
        errors.push('amount（金额信息）必填');
    } else {
        if (!Number.isInteger(body.amount.refund) || body.amount.refund <= 0) {
            errors.push('amount.refund（退款金额）必须为正整数');
        }
        if (!Number.isInteger(body.amount.total) || body.amount.total <= 0) {
            errors.push('amount.total（订单金额）必须为正整数');
        }
        if (body.amount.refund > body.amount.total) {
            errors.push('amount.refund（退款金额）不能大于 amount.total（订单金额）');
        }
    }

    return errors;
}

/**
 * 校验商家转账参数
 * 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012716434
 *
 * ⚠️ 重要规则（来自官方文档 & FAQ）：
 * 1. 同一 out_bill_no 重试期为 3 个自然日，超期需换新单号
 * 2. 遇到 SYSTEM_ERROR / ACCEPTED / 频率超限，必须用相同参数 + 相同单号重试，不可换单
 * 3. user_name（收款人姓名）：< 0.3 元不支持传入，≥ 2000 元必填（需 RSA/OAEP 加密）
 * 4. appid 参数名注意大小写：后端 API 用 appid（小写 i），前端 wx.requestMerchantTransfer 用 appId（大写 I）
 */
function validateTransferParams(body) {
    const errors = [];

    if (!body.out_bill_no || typeof body.out_bill_no !== 'string') {
        errors.push('out_bill_no（商户单号）必填');
    } else if (!/^[a-zA-Z0-9]+$/.test(body.out_bill_no) || body.out_bill_no.length > 32) {
        errors.push('out_bill_no（商户单号）只能包含字母和数字，最长 32 位');
    }

    if (!body.transfer_scene_id) {
        errors.push('transfer_scene_id（转账场景ID）必填，如 1000（现金营销）');
    }

    if (!body.openid) {
        errors.push('openid（收款用户 OpenID）必填');
    }

    if (!Number.isInteger(body.transfer_amount) || body.transfer_amount <= 0) {
        errors.push('transfer_amount（转账金额）必须为正整数（单位：分）');
    } else {
        // ⚠️ 本模板仅支持免密小额转账（0.3 - 2000 元），不支持 user_name 加密
        if (body.transfer_amount < 30) {
            errors.push('transfer_amount 不能小于 30 分（0.3 元），微信规定 < 0.3 元不支持姓名校验');
        }
        if (body.transfer_amount >= 200000) {
            errors.push(
                'transfer_amount 超过 2000 元（免密上限）。' +
                '≥ 2000 元场景需填写 user_name 并进行敏感字段加密，本模板未实现此功能。'
            );
        }
    }

    if (!body.transfer_remark) {
        errors.push('transfer_remark（转账备注）必填');
    } else if (typeof body.transfer_remark === 'string' && body.transfer_remark.length > 32) {
        errors.push('transfer_remark（转账备注）最多 32 个字符');
    }

    // 🚫 模板不支持 user_name（敏感字段需加密，参考 sdkStrategy.js）
    if (body.user_name) {
        errors.push(
            'user_name 不支持。本模板仅支持免密小额转账（0.3 - 2000 元，不含 user_name）。' +
            '如需支持，请参考 sdkStrategy.js 注释自行实现敏感字段加密。'
        );
    }

    // transfer_scene_report_infos 是新版必填字段
    if (!Array.isArray(body.transfer_scene_report_infos) || body.transfer_scene_report_infos.length === 0) {
        errors.push('transfer_scene_report_infos（转账场景报备信息）必填');
    }

    return errors;
}

module.exports = { validateOrderParams, validateRefundParams, validateTransferParams };

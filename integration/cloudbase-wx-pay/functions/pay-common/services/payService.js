/**
 * 支付服务（策略入口）
 * 主动请求（下单/退款/转账）永远走 SDK 自签名直连微信
 * 回调处理根据 signMode 决定：自己验签解密 或 读取集成中心已解密的明文
 */
const { signMode, verifyMode, payConfig, trustGatewayCallback } = require('../config/config');
const SdkStrategy = require('./strategies/sdkStrategy');
const OrderService = require('./orderService');

/** 金额校验钩子未实现时只提示一次，避免每笔订单刷屏 */
let amountHookWarned = false;

/**
 * 用服务端配置覆盖客户端可传的关键字段
 *
 * appid / mchid / notify_url 决定「钱进谁的商户」和「结果回调到哪」，
 * 绝不能由请求体决定：`params.appid = params.appid || payConfig.appId`
 * 这种写法等于允许客户端换掉 AppID 或把回调地址指到自己的服务器。
 *
 * @param {Object} params - 请求参数（会被就地修改）
 * @param {string} key - 字段名
 * @param {string} serverValue - 服务端配置值
 */
function forceServerValue(params, key, serverValue) {
    if (params[key] !== undefined && params[key] !== serverValue) {
        console.warn(`[PayService] 忽略客户端传入的 ${key}，改用服务端配置`);
    }
    if (serverValue) {
        params[key] = serverValue;
    } else {
        delete params[key];
    }
}

/**
 * 校验回调明文结构：必须是对象且含业务必需字段
 *
 * 只认结构、不认来源 —— 来源可信度由 _resolveCallbackPayload 决定。
 * 没有这一步，空对象 / 字符串明文也能一路走到业务处理。
 *
 * @param {*} payload - 回调明文
 * @param {string[]} requiredFields - 必需字段
 * @param {string} label - 日志标识
 * @returns {boolean}
 */
function isPayloadValid(payload, requiredFields, label) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        console.error(`[PayService] ${label}回调明文不是对象，拒绝`);
        return false;
    }

    const missing = requiredFields.filter(
        field => payload[field] === undefined || payload[field] === null || payload[field] === ''
    );
    if (missing.length > 0) {
        console.error(`[PayService] ${label}回调明文缺少必需字段，拒绝:`, missing.join(', '));
        return false;
    }

    return true;
}

class PayService {

    constructor() {
        this.orderService = new OrderService();

        // 永远使用 SDK 策略（自己签名直连微信）
        this.strategy = new SdkStrategy(payConfig);
        console.log(`[PayService] 签名模式: SDK | 回调处理: ${signMode} | 验签方式: ${verifyMode}`);
    }

    // ========== 统一下单（支持多平台）==========

    /**
     * 统一下单
     * @param {Object} params - 下单参数（会原样发给微信支付 API，不要塞业务字段）
     * @param {string} payType - 支付类型: jsapi | h5 | native
     * @param {Object|null} [identity] - 登录身份 { openid, uid }，仅用于订单落库归属
     * @returns {Object} 微信支付返回结果
     */
    async unifiedOrder(params, payType = 'jsapi', identity = null) {
        try {
            // 注入通用参数 —— 全部由服务端赋值，客户端传的一律忽略
            // 根据 useServiceAccount 参数选择 appId（支持服务号/小程序双账号）
            if (params.useServiceAccount) {
                if (!payConfig.serviceAppId) {
                    throw new Error('useServiceAccount=true 但未配置 service_app_id 环境变量，请在 CloudBase 控制台为 pay-common 云函数添加该环境变量');
                }
                forceServerValue(params, 'appid', payConfig.serviceAppId);
            } else {
                forceServerValue(params, 'appid', payConfig.appId);
            }
            // 用完删除，不传给微信支付 API
            delete params.useServiceAccount;
            forceServerValue(params, 'mchid', payConfig.mchId);

            // 根据支付类型设置回调 URL（客户端不可指定，否则能把支付结果导流到别处）
            forceServerValue(params, 'notify_url', payConfig.jsapiNotifyUrl);

            // 归属预检：必须在调微信下单【之前】失败。
            // 放到下单后再判会出现「微信侧订单已创建、本地因无归属落库失败」的不一致状态，
            // 且无主订单会让后续查单 / 退款的归属校验失效。
            if (!this.orderService.resolveOwner(params, identity)) {
                throw new Error('订单缺少归属身份：identity.openid / identity.uid 均为空，已拒绝下单');
            }

            // 金额校验钩子：同样必须在调微信下单【之前】失败。
            // 普通微信支付按请求金额收款，平台不核对商品值多少钱 ——
            // 请求体写 amount.total=1 就是一笔 1 分钱订单，回调照样 SUCCESS。
            await this._verifyAmountBeforeOrder(params);

            // 根据支付类型调不同接口
            let result;
            switch (payType) {
                case 'h5':
                    result = await this.strategy.h5(params);
                    break;
                case 'native':
                    result = await this.strategy.native(params);
                    break;
                case 'jsapi':
                default:
                    result = await this.strategy.jsapi(params);
                    break;
            }

            if (result.status === 200 && result.data) {
                await this.orderService.handlerUnified(params, identity);
                return result;
            } else {
                console.error(`[PayService] ${payType} 下单失败: status=${result?.status}, code=${result?.data?.code}, message=${result?.data?.message}`);
                return result;
            }
        } catch (err) {
            console.error('[PayService] unifiedOrder error:', err);
            throw err;
        }
    }

    // ========== 金额校验钩子 ==========

    /**
     * 下单前的金额校验（调用业务钩子 orderService.verifyAmount）
     *
     * ⚠️ 模板默认放行：这是**演示模板**，没有商品表可供查价。
     *    接入数据库后必须在 `orderService.verifyAmount` 里按 product_id 查真实价格，
     *    与 `params.amount.total` 比对，不一致返回 `{ ok: false, reason }`。
     *    返回 `{ ok: false }` 时本方法抛错，下单在**调用微信之前**失败，
     *    不会留下「微信侧已下单、本地金额错」的不一致状态。
     *
     * @param {Object} params - 下单参数
     * @throws {Error} 钩子判定金额不合法时
     */
    async _verifyAmountBeforeOrder(params) {
        const check = await this.orderService.verifyAmount(params);

        if (check && check.ok === false) {
            throw new Error(`订单金额校验失败：${check.reason || 'amount.total 与商品价格不一致'}`);
        }

        if (!amountHookWarned) {
            amountHookWarned = true;
            console.warn('[PayService] ⚠️ 金额校验钩子未实现（orderService.verifyAmount），'
                + 'amount.total 仍由客户端决定。上线前请按商品表覆盖，详见 README「金额校验」');
        }
    }

    /**
     * 退款前的金额校验（调用业务钩子 orderService.verifyRefundAmount）
     *
     * 退款金额同样由客户端决定，`validateRefundParams` 只检查
     * `refund <= total`（两个数都来自请求体），无法防「多退」。
     * 业务侧应按落库订单金额做上限校验。
     *
     * @param {Object} params - 退款参数
     * @throws {Error} 钩子判定退款金额不合法时
     */
    async _verifyRefundAmountBeforeRefund(params) {
        const check = await this.orderService.verifyRefundAmount(params);
        if (check && check.ok === false) {
            throw new Error(`退款金额校验失败：${check.reason || '退款金额超过订单可退金额'}`);
        }
    }

    // ========== 回调处理 ==========

    /**
     * 解析回调明文（唯一入口：三个回调共用同一套「信任上游 / 自验签」判定）
     *
     * 🚨 曾经的口子：只要 `body.ParsedContent` 存在就直接采信明文，
     *    连 verifySign 里的 5 分钟时间戳检查都一起跳过 —— 任何能访问函数端口的人
     *    发 `{"ParsedContent":{"out_trade_no":"X","trade_state":"SUCCESS"}}`
     *    就是一笔「支付成功」。
     *
     * 现在的判定：
     *   1. 信任网关明文 = `signMode === 'gateway'` **且** `TRUST_GATEWAY_CALLBACK=true`
     *      （前提：函数无公网入口，回调只经集成中心转发）
     *   2. 其余情况一律自验签 + 解密，验不过就拒绝
     *   3. 无论哪条路径，明文都要过结构校验
     *
     * @param {Object} callbackParams - 回调参数
     * @param {string} label - 日志标识
     * @param {string[]} requiredFields - 明文必需字段
     * @returns {Promise<Object|null>} 明文；不可信或结构不合法返回 null
     */
    async _resolveCallbackPayload(callbackParams, label, requiredFields) {
        const trustsGateway = signMode === 'gateway' && trustGatewayCallback === true;

        if (trustsGateway && callbackParams.decryptedData) {
            // 网关转发的请求若带时间戳头，仍然做重放窗口校验（带不了就无从判断，只能靠网络隔离）
            const headerTs = parseInt(callbackParams.timestamp, 10);
            if (Number.isFinite(headerTs)
                && Math.abs(Math.floor(Date.now() / 1000) - headerTs) > 300) {
                console.warn(`[PayService] ${label}回调时间戳过期，拒绝处理。callback_ts:`, headerTs);
                return null;
            }

            const payload = callbackParams.decryptedData;
            return isPayloadValid(payload, requiredFields, label) ? payload : null;
        }

        if (callbackParams.decryptedData && !trustsGateway) {
            console.warn(`[PayService] ${label}收到网关明文（ParsedContent），但未开启 TRUST_GATEWAY_CALLBACK，`
                + '已忽略明文并走自验签。若回调只经集成中心转发且函数无公网入口，'
                + '可设 TRUST_GATEWAY_CALLBACK=true（见 README「回调安全」）');
        }

        const verified = await this.strategy.verifySign(callbackParams);
        if (!verified) {
            console.error(`[PayService] ${label}验签失败`);
            return null;
        }

        const resource = callbackParams.body?.resource;
        if (!resource || typeof resource !== 'object') {
            console.error(`[PayService] ${label}缺少 resource 密文，拒绝解密`);
            return null;
        }

        const { ciphertext, associated_data, nonce } = resource;
        const payload = await this.strategy.decryptResource(ciphertext, associated_data, nonce);
        return isPayloadValid(payload, requiredFields, label) ? payload : null;
    }

    /**
     * 支付回调处理
     * SDK 模式：验签 → 解密 → 处理业务
     * 网关模式：集成中心已解密，明文在 body.ParsedContent 中
     * @param {Object} callbackParams - 回调参数
     * @returns {Object} 解密后的支付结果
     */
    async handlePayCallback(callbackParams) {
        const payResult = await this._resolveCallbackPayload(
            callbackParams, '支付', ['out_trade_no', 'trade_state']
        );
        if (!payResult) return null;

        console.info('[PayService] 支付回调结果: out_trade_no=%s, trade_state=%s', payResult?.out_trade_no, payResult?.trade_state);

        // 异步处理业务（不阻塞回调应答）
        this.orderService.handlerUnifiedTrigger(payResult).catch(err => {
            console.error('[PayService] 异步处理支付回调业务失败:', err);
        });

        return payResult;
    }

    /**
     * 退款回调处理
     */
    async handleRefundCallback(callbackParams) {
        const refundResult = await this._resolveCallbackPayload(
            callbackParams, '退款', ['out_refund_no', 'refund_status']
        );
        if (!refundResult) return null;

        console.info('[PayService] 退款回调结果: out_refund_no=%s, refund_status=%s', refundResult?.out_refund_no, refundResult?.refund_status);

        this.orderService.handlerRefundTrigger(refundResult).catch(err => {
            console.error('[PayService] 异步处理退款回调业务失败:', err);
        });

        return refundResult;
    }

    // ========== 查询 ==========

    async queryOrderByOutTradeNo(params) {
        return this.strategy.query(params);
    }

    async queryOrderByTransactionId(params) {
        return this.strategy.query(params);
    }

    // ========== 关闭订单 ==========

    async closeOrder(params) {
        return this.strategy.close(params);
    }

    // ========== 退款 ==========

    async refund(params) {
        try {
            // 回调地址由服务端赋值，客户端不可指定
            forceServerValue(params, 'notify_url', payConfig.refundNotifyUrl);

            // 退款金额上限校验钩子：必须在调微信之前
            await this._verifyRefundAmountBeforeRefund(params);

            const result = await this.strategy.refund(params);

            if (result.status === 200 && result.data) {
                await this.orderService.handlerRefund(params);
                return result;
            } else {
                console.error('[PayService] 退款失败: status=%s, code=%s, message=%s', result?.status, result?.data?.code, result?.data?.message);
                return result;
            }
        } catch (err) {
            console.error('[PayService] refund error:', err);
            throw err;
        }
    }

    async queryRefund(params) {
        return this.strategy.queryRefund(params);
    }

    // ========== 商家转账 ==========

    /**
     * 发起商家转账（升级版 - 单笔模式）
     * 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012716434
     *
     * ⚠️ 重要：
     * 1. 受理成功 ≠ 转账成功，必须通过查单或回调确认最终状态
     * 2. 系统错误/资金不足/频率超限时，必须用相同参数重试，勿更换单号
     * 3. user_name 字段规则：< 0.3元不填，≥ 2000元必填
     */
    async transfer(params) {
        try {
            // 注入通用参数（appid / 回调地址由服务端赋值，客户端不可指定）
            // 根据 useServiceAccount 参数选择 appId（支持服务号/小程序双账号）
            if (params.useServiceAccount) {
                if (!payConfig.serviceAppId) {
                    throw new Error('useServiceAccount=true 但未配置 service_app_id 环境变量，请在 CloudBase 控制台为 pay-common 云函数添加该环境变量');
                }
                forceServerValue(params, 'appid', payConfig.serviceAppId);
            } else {
                forceServerValue(params, 'appid', payConfig.appId);
            }
            // 用完删除，不传给微信支付 API
            delete params.useServiceAccount;
            // 转账回调 URL
            forceServerValue(params, 'notify_url', payConfig.transferNotifyUrl);

            const result = await this.strategy.transfer(params);

            if (result.status === 200 && result.data?.out_bill_no) {
                console.info('[PayService] 转账受理成功, transfer_bill_no:', result.data.transfer_bill_no, 'out_bill_no:', result.data.out_bill_no);
                // 业务钩子：记录转账单
                await this.orderService.handlerTransfer(params, result.data);
            } else {
                console.error('[PayService] 转账失败: status=%s, code=%s, message=%s', result?.status, result?.data?.code, result?.data?.message);
            }

            return result;
        } catch (err) {
            console.error('[PayService] transfer error:', err);
            throw err;
        }
    }

    /**
     * 商户单号查询转账单（升级版）
     */
    async queryTransferBill(params) {
        return this.strategy.queryTransferBill(params);
    }

    /**
     * 微信单号查询转账单（升级版）
     */
    async queryTransferBillByNo(params) {
        return this.strategy.queryTransferBillByNo(params);
    }

    /**
     * 商家转账回调处理
     */
    async handleTransferCallback(callbackParams) {
        const transferResult = await this._resolveCallbackPayload(
            callbackParams, '转账', ['out_bill_no', 'state']
        );
        if (!transferResult) return null;

        console.info('[PayService] 转账回调结果: out_bill_no=%s, state=%s', transferResult?.out_bill_no, transferResult?.state);

        this.orderService.handlerTransferTrigger(transferResult).catch(err => {
            console.error('[PayService] 异步处理转账回调业务失败:', err);
        });

        return transferResult;
    }
}

module.exports = PayService;

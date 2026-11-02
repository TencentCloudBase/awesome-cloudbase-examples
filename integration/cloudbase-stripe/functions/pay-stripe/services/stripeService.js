/**
 * Stripe 服务（策略入口）
 *
 * 主动请求（创建 Session / 查询 / 退款）永远走 SDK 用 sk 直连 Stripe
 * 回调处理根据 signMode 决定：自己验签 或 读取集成中心已验签的明文
 */
const { signMode, stripeConfig } = require('../config/config');
const StripeStrategy = require('./strategies/stripeStrategy');
const { toMinorUnits } = require('../utils/currency');

/**
 * Stripe 事件类型 → 业务语义映射
 * 一期重点关注前两个；其余预留给二期（退款/争议）
 */
const EVENT_SEMANTICS = {
    'checkout.session.completed': { biz: 'order', state: 'PAID' },
    'checkout.session.expired': { biz: 'order', state: 'EXPIRED' },
    'payment_intent.succeeded': { biz: 'order', state: 'PAID' },
    'payment_intent.payment_failed': { biz: 'order', state: 'FAILED' },
    'charge.refunded': { biz: 'refund', state: 'REFUNDED' },
    'charge.dispute.created': { biz: 'dispute', state: 'DISPUTED' },
};

class StripeService {
    constructor() {
        this.strategy = new StripeStrategy(stripeConfig);

        // ⚠️ 幂等集合：Stripe 不保证只投递一次，也不保证顺序
        // 示例用内存 Set，生产环境请替换为数据库唯一索引（event_id 建唯一键）
        this.processedEvents = new Set();

        console.log(`[StripeService] signMode: ${signMode}`);
    }

    // ========== 正向下单 ==========

    /**
     * 创建 Checkout Session
     * 支持两种入参：
     *   1) 直接传 line_items（Stripe 原生结构）
     *   2) 传 amount + currency + productName（模板自动转最小货币单位并构造 line_items）
     *
     * @param {Object} params
     * @returns {Object} { sessionId, url, ... }
     */
    async createSession(params) {
        const body = this._buildSessionParams(params);

        const session = await this.strategy.createSession(body);

        console.info('[StripeService] Session 创建成功:', session.id);

        return {
            sessionId: session.id,
            url: session.url,
            // 嵌入式收银台（二期）需要 client_secret
            clientSecret: session.client_secret || null,
            status: session.status,
            paymentStatus: session.payment_status,
            // 原样返回，业务侧可拿 expires_at 做倒计时
            expiresAt: session.expires_at,
            raw: session,
        };
    }

    /**
     * 构造 Stripe create 参数（处理金额单位 + 跳转地址兜底）
     */
    _buildSessionParams(p) {
        const {
            line_items: lineItems,
            amount,
            currency = 'usd',
            productName = 'Order',
            quantity = 1,
            mode = 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: clientRefId,
            metadata = {},
            customer_email: customerEmail,
            ...rest
        } = p;

        let items = lineItems;
        if (!items) {
            if (amount === undefined || amount === null) {
                throw new Error('缺少金额：请传 line_items 或 amount + currency');
            }
            // 金额单位转换：主单位 → 最小货币单位（零小数币种不乘 100）
            const unitAmount = toMinorUnits(Number(amount), currency);
            items = [
                {
                    price_data: {
                        currency: String(currency).toLowerCase(),
                        unit_amount: unitAmount,
                        product_data: { name: productName },
                    },
                    quantity,
                },
            ];
        }

        const finalSuccessUrl = successUrl || stripeConfig.successUrl;
        const finalCancelUrl = cancelUrl || stripeConfig.cancelUrl;

        if (mode === 'payment' && !finalSuccessUrl) {
            throw new Error('缺少 success_url：hosted_page 模式必填（可由环境变量 stripeSuccessUrl 兜底）');
        }

        const body = {
            mode,
            line_items: items,
            client_reference_id: clientRefId,
            metadata,
            ...rest,
        };

        if (finalSuccessUrl) body.success_url = finalSuccessUrl;
        if (finalCancelUrl) body.cancel_url = finalCancelUrl;
        if (customerEmail) body.customer_email = customerEmail;

        return body;
    }

    /**
     * 查询 Session 状态
     * @param {string} sessionId
     */
    async retrieveSession(sessionId) {
        if (!sessionId) throw new Error('缺少 sessionId');

        const session = await this.strategy.retrieveSession(sessionId);

        return {
            sessionId: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
            // 对账用：等价于微信支付的 out_trade_no
            clientReferenceId: session.client_reference_id,
            amountTotal: session.amount_total,
            currency: session.currency,
            raw: session,
        };
    }

    // ========== 异步回调 ==========

    /**
     * Webhook 回调统一处理
     *
     * signMode='gateway'：集成中心已验签，明文在 body.ParsedContent（或 body 本体）
     * signMode='sdk'    ：用 constructEvent(rawBody, signature) 自验签
     *
     * @param {Object} callbackParams - { body, rawBody, signature }
     * @returns {Object|null} 解析出的事件对象，验签失败返回 null
     */
    async handleWebhook(callbackParams) {
        const { body, rawBody, signature } = callbackParams;

        let event;

        if (signMode === 'gateway') {
            // 集成中心代验签：明文直接可用
            // TODO(集成中心联调)：确认代验签后的明文字段名
            //   微信支付是 body.ParsedContent，Stripe 侧待与网关确认后对齐
            event = body?.ParsedContent || body?.ParsedNotify || body;
            console.info('[StripeService] gateway 模式：使用集成中心已验签明文');
        } else {
            // SDK 模式：自己验签
            if (!rawBody) {
                console.error('[StripeService] sdk 模式缺少 rawBody，无法验签');
                return null;
            }
            try {
                event = this.strategy.verifyWebhook(rawBody, signature);
                console.info('[StripeService] sdk 模式验签通过, event:', event.id);
            } catch (err) {
                console.error('[StripeService] 验签失败:', err.message);
                return null;
            }
        }

        if (!event?.type) {
            console.error('[StripeService] 回调缺少 event.type，无法分发');
            return null;
        }

        // 幂等去重：同一 event.id 可能重复投递
        if (this.processedEvents.has(event.id)) {
            console.warn('[StripeService] 重复事件已忽略:', event.id);
            return { duplicated: true, eventId: event.id, type: event.type };
        }
        this.processedEvents.add(event.id);

        const semantic = EVENT_SEMANTICS[event.type];
        if (!semantic) {
            console.info('[StripeService] 未订阅的事件类型，忽略:', event.type);
            return { ignored: true, eventId: event.id, type: event.type };
        }

        console.info(`[StripeService] 事件 ${event.type} → ${semantic.biz}/${semantic.state}`);

        // TODO(业务侧)：在此对接自己的订单表
        //   1. 用 event.data.object.client_reference_id 找到本地订单
        //   2. 更新订单状态为 semantic.state
        //   3. 发货 / 开通权益
        return {
            duplicated: false,
            eventId: event.id,
            type: event.type,
            biz: semantic.biz,
            state: semantic.state,
            data: event.data?.object,
        };
    }
}

module.exports = StripeService;
module.exports.EVENT_SEMANTICS = EVENT_SEMANTICS;

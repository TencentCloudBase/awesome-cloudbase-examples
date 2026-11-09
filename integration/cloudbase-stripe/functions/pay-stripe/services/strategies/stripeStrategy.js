/**
 * Stripe SDK 策略
 *
 * 主动请求（下单/查单/退款）走 sk 直连 Stripe
 * 回调验签：一律由 constructEvent() 完成（stripe-pay 不做网关代验签）
 *
 * 与微信支付的差异：
 * - 微信需要自己管私钥/PEM/证书序列号做请求签名
 * - Stripe 一把 sk 搞定请求，一个 whsec 搞定验签，SDK 内部封装了所有密码学细节
 */
const Stripe = require('stripe');

/**
 * 主动请求超时（毫秒）
 *
 * 🚨 Stripe SDK 默认超时 80 秒，而云函数配置的是 30 秒：Stripe 侧慢响应时
 *    函数先被平台掐断，调用方看到「函数超时」，但订单/Session 已在 Stripe 建好，
 *    重试就会产生重复单据。给客户端设一个明显小于函数超时的值（10 秒），
 *    让失败发生在可解释的一侧，并留下 Stripe 的 requestId 便于对账。
 */
const STRIPE_TIMEOUT_MS = 10000;

class StripeStrategy {
    constructor(stripeConfig) {
        this.stripeConfig = stripeConfig;
        this._stripe = null;
    }

    /**
     * 懒加载 Stripe 客户端
     *
     * ⚠️ 为什么不在构造函数里直接 new Stripe()：
     * Stripe SDK 在 apiKey 为空时会抛 "Neither apiKey nor config.authenticator provided"，
     * 而控制器在模块加载时就会 new StripeService()，导致「凭证还没配好」时整个云函数
     * 启动失败且报错隐晦。改为首次真正调用时再初始化，保证先部署、后补凭证也能起来。
     */
    get stripe() {
        if (!this._stripe) {
            const { secretKey, apiVersion } = this.stripeConfig;
            if (!secretKey) {
                throw new Error(
                    'stripeSecretKey 未配置，请在集成中心或云函数环境变量中填写（sk_/rk_ 开头）'
                );
            }
            // apiVersion 为空时不锁版本（由账户默认版本决定），但生产环境强烈建议锁定
            this._stripe = Stripe(secretKey, {
                apiVersion: apiVersion || undefined,
                // 10 秒 < 云函数 30 秒：把超时暴露在本侧，而不是函数被平台掐断
                timeout: STRIPE_TIMEOUT_MS,
            });
            console.log(
                `[StripeStrategy] 客户端已初始化 | apiVersion: ${apiVersion || '(账户默认)'}`
            );
        }
        return this._stripe;
    }

    // ========== 主动请求 ==========

    /**
     * 创建 Checkout Session（托管收银台）
     * @param {Object} params - stripe.checkout.sessions.create 参数
     */
    async createSession(params) {
        return this.stripe.checkout.sessions.create(params);
    }

    /**
     * 查询 Session 状态
     * @param {string} sessionId
     */
    async retrieveSession(sessionId) {
        return this.stripe.checkout.sessions.retrieve(sessionId);
    }

    /**
     * 发起退款
     *
     * @param {Object} params - stripe.refunds.create 参数（payment_intent / amount / reason / metadata）
     * @param {string} [idempotencyKey] - 幂等键：网络重试时 Stripe 返回同一笔退款，不会重复退
     */
    async createRefund(params, idempotencyKey) {
        const options = idempotencyKey ? { idempotencyKey } : undefined;
        return this.stripe.refunds.create(params, options);
    }

    /**
     * 凭证探活：创建集成时校验 sk 是否有效
     * 能返回余额即视为密钥有效
     */
    async ping() {
        return this.stripe.balance.retrieve();
    }

    // ========== 回调验签 ==========

    /**
     * 校验 Webhook 签名并解析事件
     *
     * 一次调用内部依次完成四件事：
     *   1. 从 Stripe-Signature 拆出 t（时间戳）和 v1（签名）
     *   2. 拼 ${t}.${rawBody}
     *   3. 以 whsec 为密钥做 HMAC-SHA256，常量时间比对任一 v1
     *   4. 校验时间戳在默认 300 秒窗口内（防重放）
     * 任何一步不过即抛错
     *
     * ⚠️ rawBody 必须是未经任何修改的原始请求体字符串
     *    一旦经过 JSON.parse → stringify，签名必然校验失败
     *
     * @param {string|Buffer} rawBody - 原始请求体
     * @param {string} signature - Stripe-Signature header 值
     * @returns {Object} Stripe Event 对象
     */
    verifyWebhook(rawBody, signature) {
        if (!this.stripeConfig.webhookSecret) {
            throw new Error(
                'stripeWebhookSecret 未配置，无法验签（回调由本函数自验签，此项必填）'
            );
        }
        // 🚨 用静态 constructEvent，而不是 this.stripe.webhooks.constructEvent：
        //    this.stripe 的 getter 要求 stripeSecretKey，只配了 whsec 时会抛
        //    「stripeSecretKey 未配置」，把排障方向带到错误的地方。
        //    验签本身只依赖 whsec，与 sk 无关。
        return Stripe.webhooks.constructEvent(
            rawBody,
            signature,
            this.stripeConfig.webhookSecret
        );
    }
}

module.exports = StripeStrategy;

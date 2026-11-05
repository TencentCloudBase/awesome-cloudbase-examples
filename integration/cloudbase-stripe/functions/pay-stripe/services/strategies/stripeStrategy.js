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
     * 发起退款（二期）
     * @param {Object} params - stripe.refunds.create 参数
     */
    async createRefund(params) {
        return this.stripe.refunds.create(params);
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
        return this.stripe.webhooks.constructEvent(
            rawBody,
            signature,
            this.stripeConfig.webhookSecret
        );
    }
}

module.exports = StripeStrategy;

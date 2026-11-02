/**
 * pay-stripe 配置管理
 * 优先从环境变量读取，回退到默认值
 */

// Stripe 凭证前缀规则（用于创建集成时的表单校验）
const SECRET_KEY_RE = /^(sk|rk)_(test|live)_[A-Za-z0-9]{24,}$/;
const WEBHOOK_SECRET_RE = /^whsec_[A-Za-z0-9]{32,}$/;

const config = {
    // 回调验签模式: 'sdk' | 'gateway'
    //
    // sdk:     云函数自己调 stripe.webhooks.constructEvent() 验签
    //          对应「开发者在 Stripe 后台自建 endpoint，交 sk + whsec 两把」
    //
    // gateway: 集成中心网关代验签后转发明文，云函数直接处理业务
    //          对应「平台代建 endpoint，开发者只交 sk 一把」
    //
    // ⚠️ 两种模式下，主动请求（下单/查单/退款）都走 SDK 用 sk 直连 Stripe
    signMode: process.env.signMode || 'gateway',

    stripeConfig: {
        // 服务端调用凭证（sk_live_ / sk_test_）
        // 建议引导使用受限密钥 rk_（RAK），仅勾选所需写权限，比全权限 sk_ 更安全
        secretKey: process.env.stripeSecretKey || '',

        // Webhook 验签密钥（whsec_），sdk 模式必填
        // ⚠️ whsec 只在 endpoint 创建时返回一次，丢失只能删了重建
        // ⚠️ 每个 endpoint 独立一份，test / live 各一套
        webhookSecret: process.env.stripeWebhookSecret || '',

        // 锁定 API 版本（如 2026-08-26.dahlia）
        // Stripe 版本升级是刻意不向后兼容的，不锁版本会因字段路径变化导致模板静默失效
        apiVersion: process.env.stripeApiVersion || '',

        // Checkout 托管页跳转地址（ui_mode=hosted_page 时必填）
        // 配置后前端无需每次传 success_url / cancel_url；前端传值优先
        successUrl: process.env.stripeSuccessUrl || '',
        cancelUrl: process.env.stripeCancelUrl || '',
    },
};

/**
 * 从密钥前缀推断模式：test | live | unknown
 * whsec_ 前缀无法区分 test/live，因此一致性只能依赖 sk 侧判断 + 创建时校验
 */
function detectKeyMode(secretKey) {
    if (/_test_/.test(secretKey)) return 'test';
    if (/_live_/.test(secretKey)) return 'live';
    return 'unknown';
}

/**
 * 校验配置完整性
 * 启动时调用，只告警不阻断（允许先部署后补凭证）
 */
function validateConfig() {
    const errors = [];
    const { stripeConfig, signMode } = config;

    if (!stripeConfig.secretKey) {
        errors.push('stripeSecretKey 未配置');
    } else if (!SECRET_KEY_RE.test(stripeConfig.secretKey)) {
        errors.push(
            'stripeSecretKey 格式不合法，应为 sk_/rk_ + test/live + 24 位以上字符（例：sk_test_51H...）'
        );
    }

    // sdk 模式必须自己验签 → whsec 必填
    if (signMode === 'sdk') {
        if (!stripeConfig.webhookSecret) {
            errors.push('signMode=sdk 时 stripeWebhookSecret 必填（云函数需自行验签）');
        } else if (!WEBHOOK_SECRET_RE.test(stripeConfig.webhookSecret)) {
            errors.push('stripeWebhookSecret 格式不合法，应为 whsec_ + 32 位以上字符');
        }
    }

    if (!stripeConfig.apiVersion) {
        errors.push('stripeApiVersion 未配置（强烈建议锁定，否则 Stripe 升级可能导致模板失效）');
    }

    if (!['sdk', 'gateway'].includes(signMode)) {
        errors.push(`signMode 值无效: "${signMode}"，仅支持 "sdk" 或 "gateway"`);
    }

    const mode = detectKeyMode(stripeConfig.secretKey);
    if (mode !== 'unknown') {
        console.info(`[Config] Stripe 密钥模式: ${mode.toUpperCase()}，signMode: ${signMode}`);
    }

    if (errors.length > 0) {
        console.warn('⚠️ 配置校验警告（共 ' + errors.length + ' 项）:');
        errors.forEach((msg, idx) => console.warn(`  ${idx + 1}. ${msg}`));
    }

    return errors;
}

module.exports = { ...config, validateConfig, detectKeyMode, SECRET_KEY_RE, WEBHOOK_SECRET_RE };

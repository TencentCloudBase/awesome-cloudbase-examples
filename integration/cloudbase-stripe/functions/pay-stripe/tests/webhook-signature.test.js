/**
 * 真实验签测试
 *
 * 其它 webhook 用例都把 verifyWebhook 换成了「直接 JSON.parse」，跑得快，
 * 但没有任何一条真的走过 Stripe 的 HMAC-SHA256 验签。
 * 这里用 SDK 自带的 generateTestHeaderString 生成真实签名，
 * 保证 verifyWebhook 这条链路本身可用，并且改动报文后确实会被拒绝。
 */
const test = require('node:test');
const assert = require('node:assert');
const Stripe = require('stripe');

const FAKE_WHSEC = 'whsec_' + 'a'.repeat(32);

function loadService(extraEnv = {}) {
    [
        'stripeSecretKey', 'stripeWebhookSecret', 'stripeApiVersion',
        'stripeSuccessUrl', 'stripeCancelUrl',
        'notifyURLCallbackType', 'notifyUrlCallbackType', 'ALLOW_ANONYMOUS_DEV',
    ].forEach(k => delete process.env[k]);
    process.env.stripeWebhookSecret = FAKE_WHSEC;
    process.env.stripeApiVersion = '2026-08-26.dahlia';
    Object.entries(extraEnv).forEach(([k, v]) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    });

    Object.keys(require.cache)
        .filter(k => k.includes('pay-stripe'))
        .forEach(k => delete require.cache[k]);

    const StripeService = require('../services/stripeService');
    return new StripeService();
}

function makeEvent() {
    return {
        id: 'evt_real_sig_01',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_real_sig_01',
                object: 'checkout.session',
                status: 'complete',
                payment_status: 'paid',
                client_reference_id: 'ORDER_REAL_SIG',
            },
        },
    };
}

const sign = (payload) => Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: FAKE_WHSEC,
});

test('✅ 真实 stripe-signature：验签通过并映射为 PAID', async () => {
    const svc = loadService();
    const event = makeEvent();
    const rawBody = JSON.stringify(event);

    const result = await svc.handleWebhook({
        body: event, rawBody, signature: sign(rawBody),
    });

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.state, 'PAID');
    assert.strictEqual(result.data.client_reference_id, 'ORDER_REAL_SIG');
});

test('⛔ 报文被改过（沿用原签名）：验签失败，不写去重键', async () => {
    const svc = loadService();
    const event = makeEvent();
    const rawBody = JSON.stringify(event);
    const signature = sign(rawBody);

    // 同样的签名，但报文把订单号换掉 —— 必须被 HMAC 校验挡住
    const tampered = JSON.stringify({
        ...event,
        data: { object: { ...event.data.object, client_reference_id: 'ORDER_TAMPERED' } },
    });

    const result = await svc.handleWebhook({
        body: JSON.parse(tampered),
        rawBody: tampered,
        signature,
    });

    assert.strictEqual(result, null);
    assert.strictEqual(svc.processedEvents.size, 0, '验签失败不能占用去重键');
});

test('✅ 只配 whsec、不配 sk 也能验签：不再误报 stripeSecretKey 未配置', async () => {
    const svc = loadService({ stripeSecretKey: undefined });
    assert.strictEqual(svc.strategy.stripeConfig.secretKey, '');

    const event = makeEvent();
    const rawBody = JSON.stringify(event);
    const result = await svc.handleWebhook({
        body: event, rawBody, signature: sign(rawBody),
    });

    assert.strictEqual(result.state, 'PAID', '验签只依赖 whsec，与 sk 无关');
});

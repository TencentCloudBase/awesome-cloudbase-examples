/**
 * service 层下单参数：mode=setup、success_url 必填、响应不含 raw
 *
 * service 是公开导出的（可被脚本 / 二期入口单独调用），
 * 这些约束必须在 service 层成立，不能只依赖 controller 的入口校验。
 */
const test = require('node:test');
const assert = require('node:assert');

process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
delete process.env.stripeSuccessUrl;
delete process.env.stripeCancelUrl;

const StripeService = require('../services/stripeService');

const SUCCESS = 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}';

const subscriptionItem = {
    price_data: {
        unit_amount: 100,
        currency: 'usd',
        product_data: { name: 'Pro' },
        recurring: { interval: 'month' },
    },
    quantity: 1,
};

test('✅ mode=setup：不要求金额，也不下发 line_items', () => {
    const svc = new StripeService();
    const body = svc._buildSessionParams({
        mode: 'setup',
        success_url: SUCCESS,
        client_reference_id: 'ORDER_SETUP',
    });

    assert.strictEqual(body.mode, 'setup');
    assert.strictEqual(body.line_items, undefined, 'setup 不能带空 line_items 数组');
    assert.strictEqual(body.success_url, SUCCESS);
});

test('⛔ mode=setup 带金额 / line_items：本地直接拒绝', () => {
    const svc = new StripeService();

    assert.throws(
        () => svc._buildSessionParams({ mode: 'setup', amount: 100, success_url: SUCCESS }),
        /setup/,
        'setup 不扣款，金额必须拒绝'
    );
    assert.throws(
        () => svc._buildSessionParams({
            mode: 'setup',
            success_url: SUCCESS,
            line_items: [{ price_data: { unit_amount: 100, currency: 'usd' }, quantity: 1 }],
        }),
        /setup/,
        'setup 不接受 line_items'
    );
});

test('⛔ mode=subscription 缺 success_url：本地报错，不打到 Stripe', () => {
    const svc = new StripeService();

    assert.throws(
        () => svc._buildSessionParams({
            mode: 'subscription',
            line_items: [subscriptionItem],
        }),
        /success_url/,
        '三种托管模式的 success_url 都必填'
    );
});

test('⛔ 非字符串 success_url（service 直连）：报可读参数错误，不抛 TypeError', () => {
    const svc = new StripeService();
    const base = { amount: 100, currency: 'usd', productName: 'T', client_reference_id: 'O1' };

    // controller 的 typeof 校验只对 HTTP 入口生效；service 公开导出，
    // 脚本 / 二期入口可以绕过它直传非字符串真值。
    for (const bad of [123, {}, ['https://example.com/ok']]) {
        assert.throws(
            () => svc._buildSessionParams({ ...base, success_url: bad }),
            (err) => err instanceof Error
                && !(err instanceof TypeError)
                && /success_url/.test(err.message),
            `success_url=${JSON.stringify(bad)} 必须给出可读的参数错误`
        );
    }
});

test('⛔ 空 success_url 仍报「缺少 success_url」，不受类型校验影响', () => {
    const svc = new StripeService();

    assert.throws(
        () => svc._buildSessionParams({ amount: 100, currency: 'usd', success_url: '' }),
        /success_url/
    );
});

test('⛔ 下单响应不回传 Stripe raw 对象（与查单口径一致）', async () => {
    const svc = new StripeService();
    svc.strategy = {
        createSession: async () => ({
            id: 'cs_test_1',
            url: 'https://checkout.stripe.com/c/pay/cs_test_1',
            client_secret: 'cs_secret',
            status: 'open',
            payment_status: 'unpaid',
            expires_at: 1700000000,
            customer_details: { email: 'leak@example.com' },
        }),
    };

    const result = await svc.createSession({
        amount: 100,
        currency: 'usd',
        productName: 'T',
        client_reference_id: 'ORDER_RAW',
        success_url: SUCCESS,
    });

    assert.strictEqual(result.raw, undefined);
    assert.strictEqual(result.sessionId, 'cs_test_1');
    assert.strictEqual(
        JSON.stringify(result).includes('leak@example.com'),
        false,
        'Stripe 客户信息不能随响应返回前端'
    );
});

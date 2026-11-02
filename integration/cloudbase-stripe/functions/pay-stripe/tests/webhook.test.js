const test = require('node:test');
const assert = require('node:assert');

// 拼接构造：完整形态的 sk_test_ 字面量会被 GitHub Push Protection 判成真实密钥而拒绝 push
const FAKE_SK = 'sk_' + 'test_' + 'x'.repeat(24);
const FAKE_WHSEC = 'whsec_' + 'a'.repeat(32);

/**
 * 重新加载 service，使 config 重新读取环境变量
 * （signMode / 凭证都是模块加载时读取的）
 */
function loadService(signMode) {
    ['signMode', 'stripeSecretKey', 'stripeWebhookSecret', 'stripeApiVersion'].forEach(
        k => delete process.env[k]
    );
    process.env.signMode = signMode;
    process.env.stripeSecretKey = FAKE_SK;
    process.env.stripeWebhookSecret = FAKE_WHSEC;
    process.env.stripeApiVersion = '2026-08-26.dahlia';

    Object.keys(require.cache)
        .filter(k => k.includes('pay-stripe'))
        .forEach(k => delete require.cache[k]);

    const StripeService = require('../services/stripeService');
    // 每次返回新实例：幂等集合是实例级的，保证用例之间互不污染
    return new StripeService();
}

/** 构造一个最小可用的 Stripe 事件报文 */
function makeEvent(overrides = {}) {
    return {
        id: 'evt_test_0001',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: 'cs_test_0001',
                object: 'checkout.session',
                payment_status: 'paid',
                client_reference_id: 'ORDER_123',
            },
        },
        ...overrides,
    };
}

// ========== sdk 模式：云函数自验签 ==========

test('sdk 模式：验签通过并返回业务语义', async () => {
    const svc = loadService('sdk');
    svc.strategy = {
        verifyWebhook: (rawBody) => JSON.parse(rawBody),
    };

    const event = makeEvent();
    const rawBody = JSON.stringify(event);

    const result = await svc.handleWebhook({ body: event, rawBody, signature: 'v1=good' });

    assert.strictEqual(result.eventId, 'evt_test_0001');
    assert.strictEqual(result.biz, 'order');
    assert.strictEqual(result.state, 'PAID');
    assert.strictEqual(result.data.client_reference_id, 'ORDER_123');
});

test('sdk 模式：验签失败返回 null', async () => {
    const svc = loadService('sdk');
    svc.strategy = {
        verifyWebhook: () => { throw new Error('No signatures found matching the expected signature'); },
    };

    const event = makeEvent();
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 'v1=bad',
    });

    assert.strictEqual(result, null);
});

test('sdk 模式：缺少 rawBody 直接返回 null', async () => {
    const svc = loadService('sdk');
    svc.strategy = { verifyWebhook: () => makeEvent() };

    const result = await svc.handleWebhook({ body: makeEvent(), rawBody: null, signature: 'v1=x' });
    assert.strictEqual(result, null);
});

test('幂等：同一 event.id 重复投递被忽略', async () => {
    const svc = loadService('sdk');
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_dup_0001' });
    const rawBody = JSON.stringify(event);

    const first = await svc.handleWebhook({ body: event, rawBody, signature: 'v1=good' });
    const second = await svc.handleWebhook({ body: event, rawBody, signature: 'v1=good' });

    assert.strictEqual(first.duplicated, false);
    assert.strictEqual(second.duplicated, true);
    assert.strictEqual(second.eventId, 'evt_dup_0001');
});

test('未订阅的事件类型被忽略', async () => {
    const svc = loadService('sdk');
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_other_0001', type: 'customer.created' });
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 'v1=good',
    });

    assert.strictEqual(result.ignored, true);
});

// ========== gateway 模式：集成中心代验签 ==========

test('gateway 模式：直接使用已验签明文，不再验签', async () => {
    const svc = loadService('gateway');
    // 若误走验签会抛错，这里刻意不 mock，证明不会调用
    svc.strategy = {
        verifyWebhook: () => { throw new Error('gateway 模式不应调用验签'); },
    };

    const event = makeEvent({ id: 'evt_gw_0001' });

    // 模拟集成中心把明文放在 body.ParsedContent
    const result = await svc.handleWebhook({ body: { ParsedContent: event } });

    assert.strictEqual(result.eventId, 'evt_gw_0001');
    assert.strictEqual(result.state, 'PAID');
});

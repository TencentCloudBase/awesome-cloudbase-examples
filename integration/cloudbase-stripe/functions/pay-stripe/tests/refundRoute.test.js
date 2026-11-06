/**
 * 退款路由：鉴权、参数校验、云 API _action 入口可达
 *
 * 打桩 StripeService.prototype.createRefund，不真的请求 Stripe。
 */
const test = require('node:test');
const assert = require('node:assert');

process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
delete process.env.ALLOW_ANONYMOUS_DEV; // 本文件要验证 401，不能被匿名开关放行

const StripeService = require('../services/stripeService');
let stubError = null;
let stubParams = null;

StripeService.prototype.createRefund = async (params) => {
    stubParams = params;
    if (stubError) throw stubError;
    return {
        refundId: 're_test_1',
        status: 'succeeded',
        amount: params.amount ?? 990,
        currency: 'usd',
        paymentIntentId: 'pi_test_1',
        sessionId: params.sessionId,
    };
};

const app = require('../app');
const server = app.listen(0, '127.0.0.1');
const listening = new Promise(resolve => server.once('listening', resolve));

const AUTHED = { 'x-userid': 'uid_alice', 'x-authmethod': 'JWT' };

async function post(payload, headers = AUTHED, path = '/stripe/create_refund') {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(payload),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
}

test.beforeEach(() => {
    stubError = null;
    stubParams = null;
});

test.after(() => {
    server.closeAllConnections?.();
    server.close();
});

test('✅ 退款成功：200，返回业务字段且不含 raw', async () => {
    const { status, data } = await post({ session_id: 'cs_test_abc12345', amount: 300 });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.data.refundId, 're_test_1');
    assert.strictEqual(data.data.raw, undefined);
    assert.strictEqual(stubParams.sessionId, 'cs_test_abc12345');
    assert.strictEqual(stubParams.amount, 300);
    assert.strictEqual(stubParams.ownerUid, 'uid_alice', '归属必须取网关身份，不能信请求体');
});

test('✅ 云 API _action 入口可达（stripe_create_refund）', async () => {
    const { status } = await post({ _action: 'stripe_create_refund', session_id: 'cs_test_abc12345' }, AUTHED, '/');

    assert.strictEqual(status, 200);
});

test('⛔ 未鉴权：401，且不会调用退款', async () => {
    const { status } = await post({ session_id: 'cs_test_abc12345' }, {});

    assert.strictEqual(status, 401);
    assert.strictEqual(stubParams, null);
});

test('⛔ session_id 缺失 / 形态非法：400', async () => {
    assert.strictEqual((await post({})).status, 400);
    assert.strictEqual((await post({ session_id: '../../etc/passwd' })).status, 400);
    assert.strictEqual((await post({ session_id: 123 })).status, 400);
});

test('⛔ amount 非法（0 / 负数 / 小数 / 字符串 / 布尔）：400', async () => {
    for (const amount of [0, -1, 9.9, '990', true, [990], {}]) {
        const { status } = await post({ session_id: 'cs_test_abc12345', amount });
        assert.strictEqual(status, 400, `amount=${JSON.stringify(amount)} 必须拒绝`);
    }
    assert.strictEqual(stubParams, null, '参数非法时不能调用退款');
});

test('⛔ reason 非白名单：400；合法值透传', async () => {
    assert.strictEqual((await post({ session_id: 'cs_test_abc12345', reason: 'whatever' })).status, 400);

    const { status } = await post({ session_id: 'cs_test_abc12345', reason: 'requested_by_customer' });
    assert.strictEqual(status, 200);
    assert.strictEqual(stubParams.reason, 'requested_by_customer');
});

test('⛔ idempotency_key 形态非法：400；合法值透传', async () => {
    assert.strictEqual((await post({ session_id: 'cs_test_abc12345', idempotency_key: 'x' })).status, 400);
    assert.strictEqual((await post({ session_id: 'cs_test_abc12345', idempotency_key: 123 })).status, 400);

    const { status } = await post({ session_id: 'cs_test_abc12345', idempotency_key: 'refund_key_001' });
    assert.strictEqual(status, 200);
    assert.strictEqual(stubParams.idempotencyKey, 'refund_key_001');
});

test('⛔ service 抛 404（归属不一致）：透传 404，不泄露细节', async () => {
    stubError = Object.assign(new Error('未找到该 Session'), { status: 404 });

    const { status, data } = await post({ session_id: 'cs_test_abc12345' });

    assert.strictEqual(status, 404);
    assert.match(data.msg, /未找到/);
});

test('⛔ Stripe SDK 错误：对外只给固定文案', async () => {
    stubError = Object.assign(new Error('No such payment_intent: pi_secret_detail'), {
        type: 'StripeInvalidRequestError',
    });

    const { status, data } = await post({ session_id: 'cs_test_abc12345' });

    assert.strictEqual(status, 400);
    assert.doesNotMatch(data.msg, /pi_secret_detail/, '不能回显 Stripe 原始错误');
});

/**
 * retrieveSession 的资源级鉴权
 *
 * 🚨 session_id 会出现在回跳地址、浏览器历史、Referer、工单与日志里。
 *    只判「已登录」等于允许任何登录用户拿别人的 id 查支付结果与订单号，
 *    业务侧「用 session_id 查支付结果再发货」的用法会把他人订单误判成本人已支付。
 *    归属以服务端下单时写入的 metadata.cloudbaseUid 为准（客户端改不了）。
 */

const test = require('node:test');
const assert = require('node:assert');

// 拼接构造：完整形态的 sk_test_ 字面量会被 GitHub Push Protection 判成真实密钥
process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
delete process.env.ALLOW_ANONYMOUS_DEV; // 本文件要验证 401，不能被匿名开关放行

// 打桩：不真的请求 Stripe。controller 里是同一个类的实例，patch prototype 即可生效
const StripeService = require('../services/stripeService');
let stubSession = null;
StripeService.prototype.retrieveSession = async (sessionId) => ({
    sessionId,
    status: 'complete',
    paymentStatus: 'paid',
    clientReferenceId: 'ORDER_1',
    amountTotal: 990,
    currency: 'usd',
    raw: stubSession,
});

const app = require('../app');

const server = app.listen(0, '127.0.0.1');
const listening = new Promise(resolve => server.once('listening', resolve));

/** 网关注入的已认证身份（payMiddleware 只认这两个头） */
const AUTHED = { 'x-userid': 'uid_alice', 'x-authmethod': 'JWT' };

async function post(payload, headers) {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + '/stripe/retrieve_session', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(payload),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
}

test.after(() => {
    server.closeAllConnections?.();
    server.close();
});

test('✅ 归属一致：200，且不回传 raw', async () => {
    stubSession = {
        id: 'cs_test_abc12345',
        metadata: { cloudbaseUid: 'uid_alice' },
        customer: 'cus_secret_should_not_leak',
    };

    const { status, data } = await post({ session_id: 'cs_test_abc12345' }, AUTHED);

    assert.strictEqual(status, 200);
    assert.strictEqual(data.data.paymentStatus, 'paid');
    assert.strictEqual(data.data.raw, undefined, 'raw 会把 Stripe 全部客户信息带给前端');
});

test('⛔ 查他人 Session：404（不是 403，避免变成存在性探测通道）', async () => {
    stubSession = { id: 'cs_test_abc12345', metadata: { cloudbaseUid: 'uid_bob' } };

    const { status, data } = await post({ session_id: 'cs_test_abc12345' }, AUTHED);

    assert.strictEqual(status, 404);
    assert.match(data.msg, /未找到/);
});

test('⛔ metadata 缺 cloudbaseUid：404（fail closed，不能当无主资源放行）', async () => {
    stubSession = { id: 'cs_test_abc12345', metadata: {} };

    const { status } = await post({ session_id: 'cs_test_abc12345' }, AUTHED);

    assert.strictEqual(status, 404);
});

test('⛔ 未通过网关鉴权（无 x-userid）：401', async () => {
    stubSession = { id: 'cs_test_abc12345', metadata: { cloudbaseUid: 'uid_alice' } };

    const { status } = await post({ session_id: 'cs_test_abc12345' }, {});

    assert.strictEqual(status, 401);
});

test('⛔ session_id 形态非法：400，且不会拿它去请求 Stripe', async () => {
    const { status, data } = await post({ session_id: '../../etc/passwd' }, AUTHED);

    assert.strictEqual(status, 400);
    assert.match(data.msg, /格式不合法/);
});

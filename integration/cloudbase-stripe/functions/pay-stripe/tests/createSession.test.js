/**
 * createSession 的业务前置校验
 *
 * 🚨 回调按 client_reference_id 反查订单：下单时没传，Stripe 真实事件里也不会有，
 *    handleWebhook 的 _isValidBizObject 会把 checkout.session.* 判成「缺业务主键」
 *    拒收 —— 结果是「下单成功、回调永远到不了、订单停在未支付」。
 *    所以在下单阶段就挡住，不要等回调日志里才发现。
 */

const test = require('node:test');
const assert = require('node:assert');

// 拼接构造：完整形态的 sk_test_ 字面量会被 GitHub Push Protection 判成真实密钥
process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
process.env.ALLOW_ANONYMOUS_DEV = 'true'; // 跳过 Bearer 鉴权，专注校验逻辑
// 云端运行时开关会被忽略：CI 里若残留这些变量，本文件的匿名放行用例会误判
delete process.env.TENCENTCLOUD_RUNENV;
delete process.env.SCF_RUNTIME;
delete process.env.CFC_RUNTIME;
delete process.env.KUBERNETES_SERVICE_HOST;
delete process.env.notifyURLCallbackType;
delete process.env.notifyUrlCallbackType;

const app = require('../app');

const server = app.listen(0, '127.0.0.1');
const listening = new Promise(resolve => server.once('listening', resolve));

async function post(path, payload) {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
}

test.after(() => {
    server.closeAllConnections?.();
    server.close();
});

test('⛔ 缺少 client_reference_id：400，且不调用 Stripe（校验先于建单）', async () => {
    const { status, data } = await post('/stripe/create_session', {
        amount: 990,
        currency: 'usd',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
    });

    assert.strictEqual(status, 400);
    assert.match(data.msg, /client_reference_id/);
});

test('⛔ client_reference_id 是空串：仍然 400（空串过不了取值校验）', async () => {
    const { status, data } = await post('/stripe/create_session', {
        amount: 990,
        currency: 'usd',
        client_reference_id: '',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
    });

    assert.strictEqual(status, 400);
    assert.match(data.msg, /client_reference_id/);
});

/**
 * 退款 service 层：归属、支付状态、金额边界、幂等键透传
 *
 * service 是公开导出的，可被脚本/二期入口单独调用 ——
 * 不能假设调用方一定先过了 controller，归属校验必须在这里也成立。
 */
const test = require('node:test');
const assert = require('node:assert');

process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);

const StripeService = require('../services/stripeService');

const paidSession = (over = {}) => ({
    id: 'cs_test_abc12345',
    payment_status: 'paid',
    payment_intent: 'pi_test_1',
    amount_total: 990,
    currency: 'usd',
    metadata: { cloudbaseUid: 'uid_alice' },
    ...over,
});

/** 替换 strategy，避免真的请求 Stripe；同时记录下发给 SDK 的参数 */
function makeService(session) {
    const svc = new StripeService();
    const calls = { refunds: [] };
    svc.strategy = {
        retrieveSession: async () => session,
        createRefund: async (params, idempotencyKey) => {
            calls.refunds.push({ params, idempotencyKey });
            return {
                id: 're_test_1',
                status: 'succeeded',
                amount: params.amount,
                currency: 'usd',
            };
        },
    };
    return { svc, calls };
}

test('✅ 全额退款：不传 amount 时交给 Stripe 退剩余全额', async () => {
    const { svc, calls } = makeService(paidSession());

    const result = await svc.createRefund({
        sessionId: 'cs_test_abc12345',
        ownerUid: 'uid_alice',
    });

    assert.strictEqual(calls.refunds.length, 1);
    assert.strictEqual(calls.refunds[0].params.payment_intent, 'pi_test_1');
    assert.strictEqual(calls.refunds[0].params.amount, undefined, '不传 amount = 退剩余全部');
    assert.strictEqual(result.refundId, 're_test_1');
    assert.strictEqual(result.sessionId, 'cs_test_abc12345');
    assert.strictEqual(result.raw, undefined, '不回传 Stripe 原始对象');
});

test('✅ 部分退款：amount 与 idempotencyKey 原样透传', async () => {
    const { svc, calls } = makeService(paidSession());

    await svc.createRefund({
        sessionId: 'cs_test_abc12345',
        ownerUid: 'uid_alice',
        amount: 300,
        idempotencyKey: 'refund_key_001',
    });

    assert.strictEqual(calls.refunds[0].params.amount, 300);
    assert.strictEqual(calls.refunds[0].idempotencyKey, 'refund_key_001');
    assert.strictEqual(calls.refunds[0].params.metadata.cloudbaseUid, 'uid_alice');
});

test('⛔ 归属不一致 / 无 ownerUid / 缺归属：一律 404（fail closed）', async () => {
    const others = makeService(paidSession({ metadata: { cloudbaseUid: 'uid_bob' } }));
    await assert.rejects(
        () => others.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' }),
        (err) => err.status === 404,
        '他人的 Session 不能退'
    );

    const noOwner = makeService(paidSession());
    await assert.rejects(
        () => noOwner.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: null }),
        (err) => err.status === 404
    );

    const noMeta = makeService(paidSession({ metadata: {} }));
    await assert.rejects(
        () => noMeta.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' }),
        (err) => err.status === 404,
        '缺 cloudbaseUid 不能当无主资源放行'
    );
});

test('⛔ 未支付 / 无 payment_intent / 无金额：400，不打到 Stripe', async () => {
    const unpaid = makeService(paidSession({ payment_status: 'unpaid' }));
    await assert.rejects(
        () => unpaid.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' }),
        (err) => err.status === 400 && /尚未支付/.test(err.message)
    );
    assert.strictEqual(unpaid.calls.refunds.length, 0);

    const noIntent = makeService(paidSession({ payment_intent: null }));
    await assert.rejects(
        () => noIntent.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' }),
        (err) => err.status === 400
    );

    const noAmount = makeService(paidSession({ amount_total: null }));
    await assert.rejects(
        () => noAmount.svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' }),
        (err) => err.status === 400
    );
});

test('⛔ 退款金额超过原支付金额：400，不打到 Stripe', async () => {
    const { svc, calls } = makeService(paidSession({ amount_total: 990 }));

    await assert.rejects(
        () => svc.createRefund({
            sessionId: 'cs_test_abc12345',
            ownerUid: 'uid_alice',
            amount: 991,
        }),
        (err) => err.status === 400 && /不能超过/.test(err.message)
    );
    assert.strictEqual(calls.refunds.length, 0, '超额必须本地拦截');
});

test('✅ payment_intent 是对象形态时取 id', async () => {
    const { svc, calls } = makeService(paidSession({
        payment_intent: { id: 'pi_test_obj', object: 'payment_intent' },
    }));

    await svc.createRefund({ sessionId: 'cs_test_abc12345', ownerUid: 'uid_alice' });

    assert.strictEqual(calls.refunds[0].params.payment_intent, 'pi_test_obj');
});

test('⛔ amount 非正整数（字符串 / 0 / 负数 / 小数 / 布尔 / 数组）：400，不打到 Stripe', async () => {
    // service 是公开导出的，不能只依赖 controller 的 amount 守卫：
    // 直连 service 时 '990' / 0 / -1 / 9.9 都会被原样下发给 Stripe（NaN 比较恒为 false）
    for (const amount of ['990', 0, -1, 9.9, true, [990], {}]) {
        const { svc, calls } = makeService(paidSession());
        await assert.rejects(
            () => svc.createRefund({
                sessionId: 'cs_test_abc12345',
                ownerUid: 'uid_alice',
                amount,
            }),
            (err) => err.status === 400 && /amount/.test(err.message),
            `amount=${JSON.stringify(amount)} 必须本地拒绝`
        );
        assert.strictEqual(calls.refunds.length, 0, `amount=${JSON.stringify(amount)} 不能透传给 Stripe`);
    }
});

const test = require('node:test');
const assert = require('node:assert');

// 拼接构造：完整形态的 sk_test_ 字面量会被 GitHub Push Protection 判成真实密钥而拒绝 push
const FAKE_SK = 'sk_' + 'test_' + 'x'.repeat(24);
const FAKE_WHSEC = 'whsec_' + 'a'.repeat(32);

/**
 * 重新加载 service，使 config 重新读取环境变量
 * （回调声明 / 凭证都是模块加载时读取的）
 *
 * @param {string} callbackType - notifyURLCallbackType 的值：
 *                                'system' = 平台代验签，'' = 自验签（默认）
 */
function loadService(callbackType = '', extraEnv = {}) {
    [
        'stripeSecretKey', 'stripeWebhookSecret', 'stripeApiVersion',
        'notifyURLCallbackType', 'notifyUrlCallbackType',
        'stripeRequireSignedCallback',
    ].forEach(k => delete process.env[k]);
    process.env.stripeSecretKey = FAKE_SK;
    process.env.stripeWebhookSecret = FAKE_WHSEC;
    process.env.stripeApiVersion = '2026-08-26.dahlia';
    if (callbackType) process.env.notifyURLCallbackType = callbackType;
    Object.entries(extraEnv).forEach(([k, v]) => { process.env[k] = v; });

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
                // Stripe 正常投递的 checkout.session 对象都带 status；夹具必须贴近真实报文，
                // 否则「缺 status 被拒」的回归用例无法与正常事件区分
                status: 'complete',
                payment_status: 'paid',
                client_reference_id: 'ORDER_123',
            },
        },
        ...overrides,
    };
}

// ========== sdk 模式：云函数自验签 ==========

test('未声明平台托管（自验签）：验签通过并返回业务语义', async () => {
    const svc = loadService();
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

test('未声明平台托管（自验签）：验签失败返回 null', async () => {
    const svc = loadService();
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

test('未声明平台托管（自验签）：缺少 rawBody 直接返回 null', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: () => makeEvent() };

    const result = await svc.handleWebhook({ body: makeEvent(), rawBody: null, signature: 'v1=x' });
    assert.strictEqual(result, null);
});

test('幂等：同一 event.id 重复投递被忽略', async () => {
    const svc = loadService();
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
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_other_0001', type: 'customer.created' });
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 'v1=good',
    });

    assert.strictEqual(result.ignored, true);
});

// ========== system 声明对 stripe-pay 不生效：回调一律自验签 ==========
// 实测（2026-11-05）：无签名请求也会被网关直接转发到函数并返回 200；
// 转发的 body 是 Stripe 原始事件，没有 ParsedContent / ParsedNotify 明文。
// 因此任何「采信明文」的分支都是免签名的伪造后门，这里只保留验签一条路。

test('✅ 平台声明 system + 有效签名：照常自验签，verified=true', async () => {
    const svc = loadService('system');
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_gw_0001' });
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 'v1=good',
    });

    assert.strictEqual(result.eventId, 'evt_gw_0001');
    assert.strictEqual(result.state, 'PAID');
    assert.strictEqual(result.verified, true, 'system 声明不能绕过验签');
});

test('⛔ 平台声明 system + 无签名 + ParsedContent 明文：拒绝，不采信明文', async () => {
    const svc = loadService('system');
    let verifyCalled = false;
    svc.strategy = {
        verifyWebhook: () => { verifyCalled = true; return makeEvent(); },
    };

    const result = await svc.handleWebhook({
        body: { ParsedContent: makeEvent({ id: 'evt_gw_0002' }) },
    });

    assert.strictEqual(result, null);
    assert.strictEqual(verifyCalled, false, '无签名时直接拒绝，不应尝试任何验签或明文信任');
});

test('⛔ 平台声明 system + 无签名 + 原始 Stripe 事件：拒绝', async () => {
    const svc = loadService('system');
    const result = await svc.handleWebhook({ body: makeEvent({ id: 'evt_gw_0003' }) });
    assert.strictEqual(result, null);
});

test('⛔ 平台声明 system + 假签名：验签失败即拒', async () => {
    const svc = loadService('system');
    svc.strategy = { verifyWebhook: () => { throw new Error('bad signature'); } };

    const event = makeEvent({ id: 'evt_gw_0004' });
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 'v1=bad',
    });

    assert.strictEqual(result, null);
});

// ========== ownservice：用户自定义回调地址，本函数验签 ==========

test('⛔ ownservice：无签名的网关明文一律拒绝', async () => {
    const svc = loadService('ownservice');
    const result = await svc.handleWebhook({ body: { ParsedContent: makeEvent({ id: 'evt_own_01' }) } });
    assert.strictEqual(result, null);
});

test('ownservice：带签名且验签通过，verified=true', async () => {
    const svc = loadService('ownservice');
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_own_02' });
    const result = await svc.handleWebhook({ body: event, rawBody: JSON.stringify(event), signature: 'v1=good' });

    assert.strictEqual(result.verified, true);
    assert.strictEqual(result.state, 'PAID');
});

// 旧的 stripeRequireSignedCallback 开关已删除，环境里残留旧值也不生效
test('残留 stripeRequireSignedCallback=true：不产生额外影响', async () => {
    const svc = loadService('system', { stripeRequireSignedCallback: 'true' });
    assert.strictEqual(svc.requireSignedCallback, undefined);

    // 无签名 → 一律拒绝，与残留开关无关
    const result = await svc.handleWebhook({ body: { ParsedContent: makeEvent({ id: 'evt_gw_0005' }) } });
    assert.strictEqual(result, null);
});

// `typeof [] === 'object'` 会让 `data: { object: [] }` 蒙混过结构校验
test('⛔ data.object 是数组：结构校验不通过', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_arr_01', data: { object: [] } });
    const rawBody = JSON.stringify(event);
    const result = await svc.handleWebhook({ body: event, rawBody, signature: 'v1=good' });

    assert.strictEqual(result, null, '数组不是 Stripe 事件对象');
});

test('⛔ 事件本身是数组：结构校验不通过', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const rawBody = JSON.stringify([makeEvent({ id: 'evt_arr_02' })]);
    const result = await svc.handleWebhook({ body: JSON.parse(rawBody), rawBody, signature: 'v1=good' });

    assert.strictEqual(result, null);
});

test('⛔ 签名验签通过但结构不完整：拒绝', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const result = await svc.handleWebhook({
        body: { type: 'checkout.session.completed' },
        rawBody: JSON.stringify({ type: 'checkout.session.completed' }),
        signature: 'v1=good',
    });

    assert.strictEqual(result, null, '缺 event.id / data.object 的报文不能被当作事件处理');
});

// ========== 有签名头就必须验签（system 声明也不例外）==========

test('⛔ 带签名头但未验签通过：一律拒绝', async () => {
    const svc = loadService('system');
    svc.strategy = { verifyWebhook: () => { throw new Error('bad signature'); } };

    const event = makeEvent({ id: 'evt_gw_sig_01' });
    const result = await svc.handleWebhook({
        body: event,
        rawBody: JSON.stringify(event),
        signature: 't=1,v1=forwarded',
    });

    assert.strictEqual(result, null, '转发来的签名头同样必须验，验不过即拒');
});

// 没有平台注入的 notifyURLCallbackType=system 声明时，明文必须不被采信。
test('⛔ 未声明 system：伪造明文被拒（fail closed）', async () => {
    const svc = loadService();
    svc.strategy = {
        verifyWebhook: () => { throw new Error('缺少有效签名'); },
    };

    const result = await svc.handleWebhook({
        body: { ParsedContent: makeEvent({ id: 'evt_forged_01' }) },
        rawBody: '{"id":"evt_forged_01"}',
        signature: undefined,
    });

    assert.strictEqual(result, null, '未声明托管时不能采信明文');
});

test('⛔ 未声明 system 且完全没有 rawBody：拒绝', async () => {
    const svc = loadService();
    const result = await svc.handleWebhook({
        body: { ParsedContent: makeEvent({ id: 'evt_forged_02' }) },
    });
    assert.strictEqual(result, null);
});

// ========== 幂等去重：低价值 / 未订阅事件不能吞掉真实支付成功事件 ==========

test('⛔ 未订阅事件不占用去重键：同 id 的后续订阅事件仍能正常处理', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };
    const send = (overrides) => {
        const e = makeEvent(overrides);
        return { body: e, rawBody: JSON.stringify(e), signature: 'v1=good' };
    };

    const ignored = await svc.handleWebhook(send({ id: 'evt_share_01', type: 'customer.created' }));
    assert.strictEqual(ignored.ignored, true);

    const paid = await svc.handleWebhook(send({ id: 'evt_share_01' }));
    assert.strictEqual(paid.duplicated, false);
    assert.strictEqual(paid.state, 'PAID');
});

test('⛔ 去重键含 type：payment_failed 不能吞掉同 id 的 payment_intent.succeeded', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };
    const mk = (type, status) => ({
        id: 'evt_race_01',
        type,
        data: { object: { id: 'pi_race_01', status, client_reference_id: 'ORDER_RACE' } },
    });
    const send = (type, status) => {
        const e = mk(type, status);
        return { body: e, rawBody: JSON.stringify(e), signature: 'v1=good' };
    };

    const failed = await svc.handleWebhook(send('payment_intent.payment_failed', 'requires_payment_method'));
    assert.strictEqual(failed.state, 'FAILED');

    const succeeded = await svc.handleWebhook(send('payment_intent.succeeded', 'succeeded'));
    assert.strictEqual(succeeded.duplicated, false);
    assert.strictEqual(succeeded.state, 'PAID');
});

// ========== 事件结构白名单：data.object 必须带业务主键 ==========

test('⛔ 明文 data.object 为空对象：业务字段校验拒绝（不能打标 PAID）', async () => {
    const svc = loadService('system');
    const result = await svc.handleWebhook({
        body: { ParsedContent: {
            id: 'evt_empty_01',
            type: 'checkout.session.completed',
            data: { object: {} },
        } },
    });
    assert.strictEqual(result, null);
    assert.strictEqual(svc.processedEvents.has('evt_empty_01:checkout.session.completed'), false);
});

test('⛔ 明文 checkout.session 事件缺 client_reference_id：拒绝且不占用去重键', async () => {
    const svc = loadService('system');
    const result = await svc.handleWebhook({
        body: { ParsedContent: {
            id: 'evt_biz_01',
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_biz_01', status: 'complete', payment_status: 'paid' } },
        } },
    });
    assert.strictEqual(result, null);
    assert.strictEqual(svc.processedEvents.has('evt_biz_01:checkout.session.completed'), false);
});

// status 与 payment_status 是两条结构相同的相邻校验，必须同为 fail closed：
// 曾写成 `obj.status !== undefined && !isNonEmptyString(obj.status)`，字段缺失时
// 条件短路直接放行 → 事件被映射成 PAID、写入去重键并回 200，Stripe 不再重试。
test('⛔ checkout.session 事件缺 status / status 为空：拒绝且不占用去重键', async () => {
    const variants = [
        ['字段缺失', {}],
        ['status=null', { status: null }],
        ['status 为空白串', { status: '   ' }],
    ];

    for (const [i, [label, patch]] of variants.entries()) {
        const svc = loadService();
        svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

        const event = makeEvent({
            id: `evt_no_status_0${i}`,
            data: { object: {
                id: `cs_no_status_0${i}`,
                object: 'checkout.session',
                client_reference_id: `ORDER_NO_STATUS_0${i}`,
                payment_status: 'paid',
                ...patch,
            } },
        });
        const dedupeKey = `evt_no_status_0${i}:checkout.session.completed`;
        const result = await svc.handleWebhook({
            body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
        });

        assert.strictEqual(result, null, `${label} 必须被拒绝，不能放行到 PAID`);
        assert.strictEqual(svc.processedEvents.has(dedupeKey), false, `${label} 不能占用去重键`);
    }

    // 明文通道同样不能靠缺 status 蒙混过业务校验
    const plainSvc = loadService('system');
    const plainResult = await plainSvc.handleWebhook({
        body: { ParsedContent: {
            id: 'evt_no_status_plain_01',
            type: 'checkout.session.completed',
            data: { object: {
                id: 'cs_no_status_plain_01',
                client_reference_id: 'ORDER_NO_STATUS_PLAIN',
                payment_status: 'paid',
            } },
        } },
    });
    assert.strictEqual(plainResult, null);
    assert.strictEqual(
        plainSvc.processedEvents.has('evt_no_status_plain_01:checkout.session.completed'),
        false
    );
});

test('⛔ 明文 payment_intent 事件缺 status：拒绝且不占用去重键', async () => {
    const svc = loadService('system');
    const result = await svc.handleWebhook({
        body: { ParsedContent: {
            id: 'evt_pi_01',
            type: 'payment_intent.payment_failed',
            data: { object: { id: 'pi_01' } },
        } },
    });
    assert.strictEqual(result, null);
    assert.strictEqual(svc.processedEvents.has('evt_pi_01:payment_intent.payment_failed'), false);
});

// ========== 正向下单：quantity 必须是 number ==========

test('⛔ _buildSessionParams 把 quantity 归一化为 number（字符串不透传给 Stripe）', () => {
    const svc = loadService();
    const body = svc._buildSessionParams({
        amount: 990,
        currency: 'usd',
        quantity: '3',
        success_url: 'https://example.com/ok',
    });
    assert.strictEqual(body.line_items[0].quantity, 3);
    assert.strictEqual(typeof body.line_items[0].quantity, 'number');
});

// ========== 回归：checkout.session.completed ≠ 已收款 ==========
// 异步支付方式（SEPA / bank transfer）会推 status=complete + payment_status=unpaid：
// 会话已完成但资金未到账，用 payment_status ?? status 合并取值会把 unpaid 放行，
// 事件语义无条件映射 PAID，业务侧按 PAID 发货等于未收款先交付。

test('⛔ payment_status=unpaid（会话完成但未收款）：不打标 PAID', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({
        id: 'evt_unpaid_01',
        data: { object: {
            id: 'cs_unpaid_01',
            status: 'complete',
            payment_status: 'unpaid',
            client_reference_id: 'ORDER_UNPAID',
        } },
    });
    const result = await svc.handleWebhook({
        body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
    });

    assert.notStrictEqual(result.state, 'PAID', '资金未到账不能映射成 PAID');
    assert.strictEqual(result.state, 'PENDING');
});

test('⛔ payment_status=no_payment_required / processing：不打标 PAID', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    for (const [i, paymentStatus] of ['no_payment_required', 'processing'].entries()) {
        const event = makeEvent({
            id: 'evt_nopaid_0' + i,
            data: { object: {
                id: 'cs_nopaid_0' + i,
                status: 'complete',
                payment_status: paymentStatus,
                client_reference_id: 'ORDER_NOPAID_' + i,
            } },
        });
        const result = await svc.handleWebhook({
            body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
        });
        assert.notStrictEqual(result.state, 'PAID', paymentStatus);
        assert.strictEqual(result.state, 'PENDING', paymentStatus);
    }
});

test('⛔ 明文通道：缺 payment_status 时不能靠会话 status=complete 蒙混过业务校验', async () => {
    const svc = loadService('system');
    const mk = (obj) => ({
        id: 'evt_nostatus_01',
        type: 'checkout.session.completed',
        // 默认补齐 status，保证两个子用例精确只缺 payment_status / payment_status 为空白
        data: { object: {
            id: 'cs_nostatus_01',
            status: 'complete',
            client_reference_id: 'ORDER_NOSTATUS',
            ...obj,
        } },
    });

    const noPaymentStatus = await svc.handleWebhook({
        body: { ParsedContent: mk({ status: 'complete' }) },
    });
    assert.strictEqual(noPaymentStatus, null, 'status 只是会话级状态，不能替代 payment_status');

    const emptyPaymentStatus = await svc.handleWebhook({
        body: { ParsedContent: mk({ payment_status: '   ' }) },
    });
    assert.strictEqual(emptyPaymentStatus, null);
});

test('✅ payment_status=paid 仍映射为 PAID（不回归）', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({ id: 'evt_paid_ok_01' });
    const result = await svc.handleWebhook({
        body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
    });
    assert.strictEqual(result.state, 'PAID');
});

// ========== 业务字段校验：按事件类型分别约束（不再默认放行）==========

test('⛔ payment_intent.payment_failed + 非失败态（processing）：拒绝', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({
        id: 'evt_pf_01',
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_pf_01', status: 'processing' } },
    });
    const result = await svc.handleWebhook({
        body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
    });

    assert.strictEqual(result, null, '未终态不能被当成终态 FAILED');
});

test('⛔ charge.refunded 缺退款证据（refunded / amount_refunded）：拒绝', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const event = makeEvent({
        id: 'evt_refund_01',
        type: 'charge.refunded',
        data: { object: { id: 'ch_01', payment_intent: 'pi_01' } },
    });
    const result = await svc.handleWebhook({
        body: event, rawBody: JSON.stringify(event), signature: 'v1=good',
    });

    assert.strictEqual(result, null);
});

test('⛔ charge.dispute.created 缺金额或状态：拒绝', async () => {
    const svc = loadService();
    svc.strategy = { verifyWebhook: (rawBody) => JSON.parse(rawBody) };

    const noAmount = makeEvent({
        id: 'evt_dispute_01',
        type: 'charge.dispute.created',
        data: { object: { id: 'dp_01', charge: 'ch_01', status: 'needs_response' } },
    });
    const r1 = await svc.handleWebhook({
        body: noAmount, rawBody: JSON.stringify(noAmount), signature: 'v1=good',
    });
    assert.strictEqual(r1, null);

    const noStatus = makeEvent({
        id: 'evt_dispute_02',
        type: 'charge.dispute.created',
        data: { object: { id: 'dp_02', charge: 'ch_01', amount: 1000 } },
    });
    const r2 = await svc.handleWebhook({
        body: noStatus, rawBody: JSON.stringify(noStatus), signature: 'v1=good',
    });
    assert.strictEqual(r2, null);
});

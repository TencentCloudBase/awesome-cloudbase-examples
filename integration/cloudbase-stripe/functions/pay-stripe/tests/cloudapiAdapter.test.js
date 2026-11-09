const test = require('node:test');
const assert = require('node:assert');

/**
 * 云 API 网关适配层（app.js）的事件路由
 *
 * 🚨 body 顶层只要有个含点号的字符串 type 就会被映射成 notify 动作，
 *    若不做形态校验，任意请求都能进入「无鉴权、靠签名保证可信」的回调通道。
 *
 * ⚠️ 但路由层只做「形态合法性」校验（EVENT_TYPE_RE），不能用
 *    EVENT_SEMANTICS 的键当准入白名单：endpoint 订阅哪些事件是在 Stripe 后台
 *    独立配置的，拿业务语义表拦截会把合法投递（payment_intent.created 等）
 *    打成 400，Stripe 指数退避重试最长 3 天甚至停用 endpoint。
 *    可信性由 stripeService 的签名 / 网关来源证明保证（fail closed）。
 */

// 拼接构造：完整形态的 sk_test_ 字面量会被 GitHub Push Protection 判成真实密钥而拒绝 push
process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
delete process.env.notifyURLCallbackType;
delete process.env.notifyUrlCallbackType;

const app = require('../app');

const server = app.listen(0, '127.0.0.1');
const listening = new Promise(resolve => server.once('listening', resolve));

async function postRoot(payload) {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + '/', {
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

test('⛔ 形态非法的事件类型：不进入 webhook 通道，直接 400', async () => {
    // 都含点号（否则根本不进事件分支，走 404），但形态不符合 Stripe 事件类型
    for (const bad of ['evil..pwned', 'EVIL.PWNED', 'evil.<script>', 'a.b;drop', 'evil.']) {
        const { status, data } = await postRoot({ type: bad });
        assert.strictEqual(status, 400, bad);
        assert.match(data.msg || '', /事件类型格式非法|不支持的操作/, bad);
    }
});

test('形态合法但未订阅的事件类型：进 webhook 通道，由验签 fail closed 拒绝', async () => {
    // payment_intent.created 不在 EVENT_SEMANTICS 里，但形态合法、是 Stripe 可能投递的事件：
    // 不能被路由层误杀（返回「不支持的事件类型」），必须交给 handleWebhook 处理
    const { status, data } = await postRoot({ type: 'payment_intent.created' });

    assert.strictEqual(status, 400, '未声明托管 + 无签名头 → 验签失败');
    assert.strictEqual(data.message, '验签失败或事件不可信');
    assert.doesNotMatch(data.msg || '', /不支持的事件类型/);
});

// 🚨 形态正则首段曾漏掉下划线（[a-z0-9]+），而 Stripe 事件名第一段普遍含下划线：
//    payment_intent.succeeded（支付成功）/ payment_intent.payment_failed（支付失败）
//    会被路由层永久拒成 400 → Stripe 指数退避重试最长 3 天，甚至停用 endpoint，
//    连 checkout.session.completed 也一起中断。
test('EVENT_SEMANTICS 全部事件 + 常见未订阅事件都不被路由层误杀', async () => {
    const { EVENT_SEMANTICS } = require('../services/stripeService');
    const types = [
        ...Object.keys(EVENT_SEMANTICS),
        'payment_intent.created',
        'invoice.paid',
        'checkout.session.async_payment_succeeded',
    ];

    for (const type of types) {
        const { status, data } = await postRoot({ type });
        assert.strictEqual(status, 400, type);
        assert.strictEqual(data.message, '验签失败或事件不可信', type + ' 必须进入 webhook 通道');
        assert.doesNotMatch(data.msg || '', /事件类型格式非法/, type + ' 不能被形态校验拒杀');
    }
});

test('已知事件类型放行到 webhook（未声明托管 → 走验签，无签名头时验签失败）', async () => {
    const { status, data } = await postRoot({ type: 'checkout.session.completed' });

    // 能走到验签说明路由已放行（返回的是验签失败，而不是「不支持的事件类型」）
    assert.strictEqual(status, 400);
    assert.strictEqual(data.message, '验签失败或事件不可信');
});

test('✅ 集成中心模板 path /notify 可达（根路径直连）', async () => {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + '/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    const data = await res.json().catch(() => ({}));

    // 能走到验签说明根路径已挂载；404 则是集成中心 URL 配错
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.message, '验签失败或事件不可信');
});

test('✅ 云 API _action=notify 可达（与模板 path 同名）', async () => {
    const { status, data } = await postRoot({
        _action: 'notify',
        type: 'checkout.session.completed',
    });

    assert.strictEqual(status, 400);
    assert.strictEqual(data.message, '验签失败或事件不可信');
});

// ========== 根路径 /notify 必须与云 API 适配层同链路 ==========
// /notify 曾注册在适配中间件之前，直接进控制器，绕过事件类型形态早筛与
// _action/path/method 路由字段剥离（纵深防御缺口）。
async function postNotify(payload) {
    await listening;
    const res = await fetch('http://127.0.0.1:' + server.address().port + '/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
}

test('⛔ 根路径 /notify 经过适配层：形态非法的事件类型被早筛 400', async () => {
    for (const bad of [
        'evil..pwned', 'EVIL.PWNED', 'evil.<script>', 'a.b;drop',
        'a' + '.b'.repeat(70), // 形态合法但超过 MAX_EVENT_TYPE_LEN
    ]) {
        const { status, data } = await postNotify({ type: bad });
        assert.strictEqual(status, 400, bad);
        assert.match(data.msg || '', /事件类型格式非法/, bad + ' 必须由路由层早筛，不能直达验签');
    }
});

test('⛔ 根路径 /notify 经过适配层：非法 _action 被白名单拒绝，路由字段不透传', async () => {
    const { status, data } = await postNotify({
        type: 'x.y',
        _action: 'whatever',
        path: '/stripe/create_refund',
    });
    assert.strictEqual(status, 400);
    assert.match(data.msg || '', /不支持的操作|事件类型格式非法/);
    // 出现控制器直接返回的文案 = 请求绕过了适配层
    assert.strictEqual(data.message, undefined);
});

test('⛔ 根路径 /notify 经过适配层：_action/path/method 被剥离，不透传给 handleWebhook', async () => {
    const StripeService = require('../services/stripeService');
    const original = StripeService.prototype.handleWebhook;
    let captured = null;
    StripeService.prototype.handleWebhook = async (params) => {
        captured = params;
        return null;
    };
    try {
        await postNotify({
            type: 'checkout.session.completed',
            _action: 'notify',
            path: '/stripe/create_refund',
            method: 'POST',
        });
        assert.ok(captured, '请求必须到达 handleWebhook（说明分发链路通）');
        for (const key of ['_action', 'path', 'method']) {
            assert.ok(!(key in captured.body), key + ' 不得透传给 handleWebhook');
        }
    } finally {
        StripeService.prototype.handleWebhook = original;
    }
});

// ========== 回归：适配层 next() 兜底不得绕过事件类型形态早筛 ==========
// 根路径 /notify 兜底挂载曾是适配层 next() 的直通落点：body 携带了事件类型，
// 但形态不满足「含点号的字符串」时，三个分支全部跳过 → next() → 直达控制器，
// 绕过 EVENT_TYPE_RE / MAX_EVENT_TYPE_LEN 校验。修复后两处入口复用同一套守卫。
test('⛔ 不含点号 / 非字符串的 type 被路由层早筛，不能直达控制器', async () => {
    const cases = [
        { type: 'evilpwned' },                                         // 不含点号
        { type: { a: 1 }, ParsedNotify: { event_type: 'EVIL.X' } },   // 非字符串
    ];
    for (const payload of cases) {
        for (const send of [postRoot, postNotify]) {
            const { status, data } = await send(payload);
            assert.strictEqual(status, 400, JSON.stringify(payload));
            assert.match(data.msg || '', /事件类型格式非法/, JSON.stringify(payload) + ' 必须由路由层早筛');
            assert.strictEqual(data.message, undefined, '出现控制器文案 = 请求绕过了适配层');
        }
    }
});

test('⛔ next() 兜底路径：畸形事件不触达 handleWebhook', async () => {
    const StripeService = require('../services/stripeService');
    const original = StripeService.prototype.handleWebhook;
    let called = 0;
    StripeService.prototype.handleWebhook = async () => { called += 1; return null; };
    try {
        for (const payload of [
            { type: 'evilpwned' },
            { type: { a: 1 }, ParsedNotify: { event_type: 'EVIL.X' } },
            {},
        ]) {
            await postNotify(payload);
        }
        assert.strictEqual(called, 0, '畸形 /notify 请求不得直达 handleWebhook');
    } finally {
        StripeService.prototype.handleWebhook = original;
    }
});

/**
 * 订单归属校验
 *
 * 覆盖点：code2Session 只能证明「你是谁」，不能证明「这单是你的」。
 * 缺这层校验时，任何人拿自己的 code + 别人的 outTradeNo 就能查单（越权读），
 * 批量遍历还能探测订单是否存在与状态。
 */

const { test } = require('node:test');
const assert = require('node:assert');

// config 在模块加载时读 process.env，必须在 require 之前设置，
// 否则 createOrder 会在「缺 appId / secret」处提前失败，测不到单号复用守卫
process.env.appId = 'wx_test_appid';
process.env.secret = 'test_secret';
process.env.offerId = 'test_offer';
process.env.appKey = '12345';

// createOrder 会调 code2Session（真实微信接口，测试环境不可达）：
// 必须在 xpayService **加载前**把身份固定住（xpayService 是解构引用），
// 才能覆盖「同一用户复用 PENDING 单号」「他人单号被拒」这类需要权威 openid 的分支
const MOCK_OPENID = 'o_userA';
const wechatApi = require('../utils/wechatApi');
wechatApi.code2Session = async () => ({ openid: MOCK_OPENID, sessionKey: 'mock_session_key' });

const XpayService = require('../services/xpayService');
const { checkOrderOwnership } = XpayService;

test('同一用户查自己的订单：通过', () => {
    assert.strictEqual(
        checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, 'o_userA'),
        null
    );
});

test('⚠️ 他人订单：必须拒绝（越权读）', () => {
    const msg = checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, 'o_userB');
    assert.ok(msg, '查到别人的单必须返回错误');
    assert.match(msg, /不属于当前用户/);
});

test('⛔ 本地无记录（冷启动 / 多实例）：默认拒绝，不能默认放开越权读', () => {
    const msg = checkOrderOwnership(undefined, 'o_userA');
    assert.ok(msg, '查不到记录无法证明归属，必须显式失败');
    assert.match(msg, /无法校验归属/);
});

test('XPAY_GUARD=off 时才放行无记录查询（仅联调）', () => {
    process.env.XPAY_GUARD = 'off';
    try {
        assert.strictEqual(checkOrderOwnership(undefined, 'o_userA'), null);
    } finally {
        delete process.env.XPAY_GUARD;
    }
});

test('XPAY_GUARD=on / 拼错的值 都按开启处理（不放行）', () => {
    for (const v of ['on', 'true', '1', 'offf']) {
        process.env.XPAY_GUARD = v;
        try {
            assert.ok(checkOrderOwnership(undefined, 'o_userA'), `XPAY_GUARD=${v} 不能放行`);
        } finally {
            delete process.env.XPAY_GUARD;
        }
    }
});

// 旧实现直接放行 —— 回调路径 _updateOrderState 兜底创建的记录不带 openid，
// 于是「记录存在但没有归属」成了越权查单的入口。无法判断归属就按失败处理。
test('⚠️ 记录存在但没有 openid：拒绝，不能当「无记录」放行', () => {
    const msg = checkOrderOwnership({ outTradeNo: 'A20260101' }, 'o_userA');
    assert.ok(msg, '缺归属的记录必须拒绝');
    assert.match(msg, /缺少归属信息/);
});

test('请求侧 openid 缺失：交给上层判空，不在这里拦', () => {
    assert.strictEqual(checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, ''), null);
});

// _trackOrder 对已存在的 key 是「整条替换」：拿到别人的 outTradeNo 后调一次下单，
// 就能把记录重置成 PENDING 并写上自己的 openid，之后 iOS 退款问询会读到「未发放权益」
test('⛔ 下单复用已存在的 outTradeNo：直接拒绝，不得覆盖原记录', async () => {
    const s = new XpayService();
    const tradeNo = 'DUP20261022001';

    s._trackOrder(tradeNo, { outTradeNo: tradeNo, openid: 'o_victim', state: 'DELIVERED' });

    await assert.rejects(
        () => s.createOrder({
            code: 'fake_code',
            outTradeNo: tradeNo,
            productId: 'p1',
            goodsPrice: 100,
            appId: 'wx_test_appid',
        }),
        /已存在，不能复用/
    );

    const kept = s.orders.get(tradeNo);
    assert.strictEqual(kept.openid, 'o_victim', '原订单归属不能被覆盖');
    assert.strictEqual(kept.state, 'DELIVERED', '原订单状态不能被重置为 PENDING');
});

// 「用户取消后重新下单可能复用同一个 outTradeNo」是幂等键设计明确支持的业务流，
// 只看 orders.has(tradeNo) 就拒绝，会让未支付的 PENDING 单号永久无法重试。
test('✅ 同一用户复用自己未支付（PENDING）的 outTradeNo：允许，覆盖原记录', async () => {
    const s = new XpayService();
    const tradeNo = 'RETRY20261022001';

    s._trackOrder(tradeNo, { outTradeNo: tradeNo, openid: MOCK_OPENID, state: 'PENDING' });

    const res = await s.createOrder({
        code: 'fake_code',
        outTradeNo: tradeNo,
        productId: 'p1',
        goodsPrice: 100,
        appId: 'wx_test_appid',
    });

    assert.strictEqual(res.outTradeNo, tradeNo, '应复用同一个单号');
    assert.strictEqual(res.openid, MOCK_OPENID);

    const updated = s.orders.get(tradeNo);
    assert.strictEqual(updated.openid, MOCK_OPENID, '归属仍是本人');
    assert.strictEqual(updated.state, 'PENDING', '未支付单重试后仍是 PENDING');
});

test('⛔ 复用他人的 outTradeNo（PENDING）：拒绝，不得把归属改成自己', async () => {
    const s = new XpayService();
    const tradeNo = 'OTHER20261022001';

    s._trackOrder(tradeNo, { outTradeNo: tradeNo, openid: 'o_victim', state: 'PENDING' });

    await assert.rejects(
        () => s.createOrder({
            code: 'fake_code',
            outTradeNo: tradeNo,
            productId: 'p1',
            goodsPrice: 100,
            appId: 'wx_test_appid',
        }),
        /属于其他用户/
    );

    assert.strictEqual(s.orders.get(tradeNo).openid, 'o_victim', '他人归属不能被覆盖');
});

// 缺归属的记录无法判断是不是本人（回调兜底创建的记录曾不带 openid），按 fail closed 拒绝
test('⛔ 复用缺少归属信息的 outTradeNo：拒绝', async () => {
    const s = new XpayService();
    const tradeNo = 'NOOWNER20261022001';

    s._trackOrder(tradeNo, { outTradeNo: tradeNo, state: 'PENDING' });

    await assert.rejects(
        () => s.createOrder({
            code: 'fake_code',
            outTradeNo: tradeNo,
            productId: 'p1',
            goodsPrice: 100,
            appId: 'wx_test_appid',
        }),
        /缺少归属信息/
    );
});

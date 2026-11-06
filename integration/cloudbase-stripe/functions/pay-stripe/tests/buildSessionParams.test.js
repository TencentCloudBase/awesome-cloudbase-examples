/**
 * _buildSessionParams 金额单位口径
 *
 * 需求口径：前端传「最小货币单位的整数」（9.90 美元传 990），与 Stripe API 一致。
 * 🚨 历史实现把 amount 当主单位再 ×100。按需求传 990 会被算成 $990 —— 放大 100 倍。
 *    这里把两种口径的边界钉死，避免回归。
 */

const test = require('node:test');
const assert = require('node:assert');

process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);
process.env.stripeSuccessUrl = 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}';
delete process.env.notifyURLCallbackType;
delete process.env.notifyUrlCallbackType;

const StripeService = require('../services/stripeService');
const svc = new StripeService();

const unitAmountOf = (body) => body.line_items[0].price_data.unit_amount;

test('✅ amount 是最小货币单位：990 直接作为 unit_amount，不再 ×100', () => {
    const body = svc._buildSessionParams({ amount: 990, currency: 'usd', productName: 'Pro' });
    assert.strictEqual(unitAmountOf(body), 990);
    assert.strictEqual(body.line_items[0].price_data.currency, 'usd');
});

test('✅ 零小数币种（jpy）：amount 就是整数日元，原样使用', () => {
    const body = svc._buildSessionParams({ amount: 500, currency: 'jpy' });
    assert.strictEqual(unitAmountOf(body), 500);
});

test('✅ amount_major（旧口径）仍可用：9.9 美元 → 990', () => {
    const body = svc._buildSessionParams({ amount_major: 9.9, currency: 'usd' });
    assert.strictEqual(unitAmountOf(body), 990);
});

test('✅ line_items 直传时不受影响', () => {
    const body = svc._buildSessionParams({
        line_items: [{ price_data: { currency: 'usd', unit_amount: 1999, product_data: { name: 'X' } }, quantity: 1 }],
    });
    assert.strictEqual(unitAmountOf(body), 1999);
});

test('⛔ amount 与 amount_major 同时传：报错，不做隐式取舍', () => {
    assert.throws(
        () => svc._buildSessionParams({ amount: 990, amount_major: 9.9, currency: 'usd' }),
        /只能传一个/
    );
});

test('⛔ amount 传小数（把主单位当最小单位用）：报错，不静默四舍五入', () => {
    assert.throws(() => svc._buildSessionParams({ amount: 9.9, currency: 'usd' }), /最小货币单位/);
});

test('⛔ 两个金额都没传：报错', () => {
    assert.throws(() => svc._buildSessionParams({ currency: 'usd' }), /缺少金额/);
});

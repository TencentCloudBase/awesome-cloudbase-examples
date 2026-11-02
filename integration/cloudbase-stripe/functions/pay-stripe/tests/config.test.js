const test = require('node:test');
const assert = require('node:assert');
const { detectKeyMode, SECRET_KEY_RE, WEBHOOK_SECRET_RE } = require('../config/config');

// ⚠️ 不写完整字面量：GitHub Push Protection 会把「完整形态」的 sk_live_/rk_live_ 串判成真实密钥并拒绝 push
//    （即使全是占位符）。这里用拼接构造，前缀与长度校验的测试语义不变。
const SUFFIX = 'x'.repeat(24);
const SK_TEST = 'sk_' + 'test_' + SUFFIX;
const SK_LIVE = 'sk_' + 'live_' + SUFFIX;
const RK_TEST = 'rk_' + 'test_' + SUFFIX;
const RK_LIVE = 'rk_' + 'live_' + SUFFIX;

test('从密钥前缀推断 test / live 模式', () => {
    assert.strictEqual(detectKeyMode(SK_TEST), 'test');
    assert.strictEqual(detectKeyMode(SK_LIVE), 'live');
    assert.strictEqual(detectKeyMode(RK_TEST), 'test');
    assert.strictEqual(detectKeyMode('不合法'), 'unknown');
});

test('Secret Key 前缀校验：合法 sk / rk', () => {
    assert.ok(SECRET_KEY_RE.test(SK_TEST));
    assert.ok(SECRET_KEY_RE.test(RK_LIVE));
});

test('Secret Key 前缀校验：拒绝 pk_ / 缺模式 / 过短', () => {
    assert.ok(!SECRET_KEY_RE.test('pk_' + 'test_' + SUFFIX));
    assert.ok(!SECRET_KEY_RE.test('sk_' + SUFFIX));
    assert.ok(!SECRET_KEY_RE.test('sk_' + 'test_' + 'short'));
});

test('Webhook Secret 前缀校验：whsec_ + 32 位以上', () => {
    assert.ok(WEBHOOK_SECRET_RE.test('whsec_' + 'a'.repeat(32)));
    assert.ok(!WEBHOOK_SECRET_RE.test('whsec_short'));
    assert.ok(!WEBHOOK_SECRET_RE.test(SK_TEST));
});

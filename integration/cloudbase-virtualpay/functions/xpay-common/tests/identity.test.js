/**
 * 身份来源：只认平台注入的 `x-wx-openid`
 *
 * 背景：虚拟支付只在小程序内发起（`wx.cloud.callHTTPFunction`），平台一定注入
 * `x-wx-openid`。因此没有任何需要读 `Authorization: Bearer` 的合法场景 ——
 * JWT payload 只是 base64 编码、任何人都能伪造，历史的 `trustBearerIdentity`
 * 开关已删除（打开它等于允许拼一个假 JWT 冒充用户）。
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { getOpenId, getAppId, getPlatformOpenId, normalizeOpenId } = require('../utils/cloudbaseAuth');

function jwt(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `h.${body}.s`;
}

function mockReq({ headers = {} } = {}) {
    return { headers };
}

test('只认平台注入：x-wx-openid 命中即返回', () => {
    const req = mockReq({ headers: { 'x-wx-openid': 'o_from_platform_1234' } });
    assert.strictEqual(getOpenId(req), 'o_from_platform_1234');
    assert.strictEqual(getPlatformOpenId(req), 'o_from_platform_1234');
});

test('⛔ Bearer 一律不采信（即使结构合法、provider_sub 合法）', () => {
    const req = mockReq({
        headers: { authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}` },
    });
    assert.strictEqual(getOpenId(req), null, '伪造 JWT 不能变成身份');
});

test('⛔ 残留的 trustBearerIdentity=true 也不再有任何效果', () => {
    const saved = process.env.trustBearerIdentity;
    process.env.trustBearerIdentity = 'true';
    try {
        const req = mockReq({
            headers: { authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}` },
        });
        assert.strictEqual(getOpenId(req), null, '开关已删除，环境变量不该复活旧行为');
    } finally {
        if (saved === undefined) delete process.env.trustBearerIdentity;
        else process.env.trustBearerIdentity = saved;
    }
});

test('平台头存在时，即使同时带 Bearer 也以平台头为准', () => {
    const req = mockReq({
        headers: {
            'x-wx-openid': 'o_from_platform_1234',
            authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}`,
        },
    });
    assert.strictEqual(getOpenId(req), 'o_from_platform_1234');
});

test('x-wx-openid 格式非法：忽略（不把任意字符串当身份）', () => {
    for (const bad of ['', 'x', '带中文的openid123', 'a'.repeat(80), 'o;rm -rf /']) {
        const req = mockReq({ headers: { 'x-wx-openid': bad } });
        assert.strictEqual(getOpenId(req), null, `x-wx-openid=${JSON.stringify(bad)} 不该通过`);
    }
});

test('normalizeOpenId：合法值原样返回，去空格', () => {
    assert.strictEqual(normalizeOpenId('  o_abc1234567890  '), 'o_abc1234567890');
    assert.strictEqual(normalizeOpenId(12345), null);
    assert.strictEqual(normalizeOpenId(null), null);
});

test('getAppId：只接受 wx + 16 位', () => {
    assert.strictEqual(getAppId(mockReq({ headers: { 'x-wx-appid': 'wx1234567890abcdef' } })), 'wx1234567890abcdef');
    assert.strictEqual(getAppId(mockReq({ headers: { 'x-wx-appid': 'wx123' } })), null);
    assert.strictEqual(getAppId(mockReq({ headers: { 'x-wx-appid': 'not-an-appid-1234' } })), null);
    assert.strictEqual(getAppId(mockReq()), null);
});

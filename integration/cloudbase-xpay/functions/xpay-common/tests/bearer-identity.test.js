/**
 * Bearer JWT 身份（trustBearerIdentity 开关）
 *
 * 背景：iWiki 的调用入口表里有「服务端/第三方带 access_token 调用」这一项，
 * 但 JWT payload 只是 base64 编码、任何人都能伪造。因此：
 *   - 默认关闭，只认平台注入的 x-wx-openid
 *   - 显式开启后才采信 provider_sub，前提是云函数只经云 API 网关暴露
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { getOpenId, parseCloudBaseAuth, isTrustBearerIdentity } = require('../utils/cloudbaseAuth');

function jwt(payload) {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `h.${body}.s`;
}

function mockReq({ headers = {} } = {}) {
    return { headers };
}

function withTrust(value, fn) {
    const saved = process.env.trustBearerIdentity;
    if (value === undefined) delete process.env.trustBearerIdentity;
    else process.env.trustBearerIdentity = value;

    try {
        return fn();
    } finally {
        if (saved === undefined) delete process.env.trustBearerIdentity;
        else process.env.trustBearerIdentity = saved;
    }
}

test('默认关闭：即使带合法结构的 Bearer，也不采信其身份', () => {
    withTrust(undefined, () => {
        const req = mockReq({ headers: { authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}` } });
        assert.strictEqual(isTrustBearerIdentity(), false);
        assert.strictEqual(getOpenId(req), null, '未开启时 JWT 只是可伪造的字符串');
    });
});

test('显式开启：从 provider_sub 取 openid', () => {
    withTrust('true', () => {
        const req = mockReq({ headers: { authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}` } });
        assert.strictEqual(getOpenId(req), 'o_from_jwt_123456');
    });
});

test('开启后也支持 1 作为真值', () => {
    withTrust('1', () => {
        const req = mockReq({ headers: { authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}` } });
        assert.strictEqual(getOpenId(req), 'o_from_jwt_123456');
    });
});

test('平台注入的 x-wx-openid 优先于 JWT', () => {
    withTrust('true', () => {
        const req = mockReq({
            headers: {
                'x-wx-openid': 'o_from_platform_1234',
                authorization: `Bearer ${jwt({ provider_sub: 'o_from_jwt_123456' })}`,
            },
        });
        assert.strictEqual(getOpenId(req), 'o_from_platform_1234');
    });
});

test('开启后 provider_sub 格式非法：不采信', () => {
    withTrust('true', () => {
        const req = mockReq({ headers: { authorization: `Bearer ${jwt({ provider_sub: 'x' })}` } });
        assert.strictEqual(getOpenId(req), null);
    });
});

test('开启后 JWT 缺 provider_sub（只有 sub）：不采信', () => {
    withTrust('true', () => {
        const req = mockReq({ headers: { authorization: `Bearer ${jwt({ sub: 'cloudbase-uid-123' })}` } });
        assert.strictEqual(getOpenId(req), null, 'sub 是 CloudBase UID，不是 openid');
    });
});

test('JWT 结构不合法时返回 null，不影响其他来源', () => {
    const req = mockReq({ headers: { authorization: 'Bearer not-a-jwt' } });
    assert.strictEqual(parseCloudBaseAuth(req), null);
});

test('无 Authorization 头：parseCloudBaseAuth 返回 null', () => {
    assert.strictEqual(parseCloudBaseAuth(mockReq()), null);
});

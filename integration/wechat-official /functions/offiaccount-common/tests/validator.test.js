const { describe, it } = require('node:test');
const assert = require('assert/strict');
const v = require('../utils/validator');

describe('validateCode', () => {
    it('合法→空数组', () => assert.deepEqual(v.validateCode({ code: 'abc' }), []));
    it('缺 body→报错', () => assert.ok(v.validateCode(null).length > 0));
    it('缺 code→报错', () => assert.ok(v.validateCode({}).some(x => x.includes('code'))));
    it('code 非字符串→报错', () => assert.ok(v.validateCode({ code: 123 }).some(x => x.includes('字符串'))));
});

describe('validateRefreshToken', () => {
    it('合法→空数组', () => assert.deepEqual(v.validateRefreshToken({ refresh_token: 'rt' }), []));
    it('缺 refresh_token→报错', () => assert.ok(v.validateRefreshToken({}).length > 0));
    it('非字符串→报错', () => assert.ok(v.validateRefreshToken({ refresh_token: 1 }).some(x => x.includes('字符串'))));
});

describe('validateOAuthTokenPair', () => {
    it('完整→空数组', () => assert.deepEqual(v.validateOAuthTokenPair({ access_token: 'at', openid: 'ox' }), []));
    it('缺 access_token→报错', () => assert.ok(v.validateOAuthTokenPair({ openid: 'ox' }).some(x => x.includes('access_token'))));
    it('缺 openid→报错', () => assert.ok(v.validateOAuthTokenPair({ access_token: 'at' }).some(x => x.includes('openid'))));
    it('全缺→两条', () => assert.strictEqual(v.validateOAuthTokenPair({}).length, 2));
});

describe('validateJssdkParams', () => {
    it('合法 http→空数组', () => assert.deepEqual(v.validateJssdkParams({ url: 'http://a.com' }), []));
    it('合法 https→空数组', () => assert.deepEqual(v.validateJssdkParams({ url: 'https://a.com' }), []));
    it('缺 url→报错', () => assert.ok(v.validateJssdkParams({}).some(x => x.includes('url'))));
    it('非 http(s)→报错', () => assert.ok(v.validateJssdkParams({ url: 'ftp://a.com' }).some(x => x.includes('http'))));
});

describe('validateSubscribeSend', () => {
    it('完整→空数组', () => {
        assert.deepEqual(v.validateSubscribeSend({ touser: 'ox', template_id: 'tid', data: {} }), []);
    });
    it('缺 touser→报错', () => {
        assert.ok(v.validateSubscribeSend({ template_id: 'tid', data: {} }).some(x => x.includes('touser')));
    });
    it('缺 template_id→报错', () => {
        assert.ok(v.validateSubscribeSend({ touser: 'ox', data: {} }).some(x => x.includes('template_id')));
    });
    it('缺 data→报错', () => {
        assert.ok(v.validateSubscribeSend({ touser: 'ox', template_id: 'tid' }).some(x => x.includes('data')));
    });
    it('data 非对象→报错', () => {
        assert.ok(v.validateSubscribeSend({ touser: 'ox', template_id: 'tid', data: 'xx' }).some(x => x.includes('data')));
    });
});

describe('validateMenuCreate', () => {
    it('合法→空数组', () => {
        assert.deepEqual(v.validateMenuCreate({ button: [{ name: 'a', type: 'click', key: 'K1' }] }), []);
    });
    it('缺 button→报错', () => assert.ok(v.validateMenuCreate({}).length > 0));
    it('button 非数组→报错', () => assert.ok(v.validateMenuCreate({ button: 'x' }).length > 0));
    it('空数组→报错', () => assert.ok(v.validateMenuCreate({ button: [] }).length > 0));
    it('超过 3 个→报错', () => {
        const btn = Array(4).fill({ name: 'x' });
        assert.ok(v.validateMenuCreate({ button: btn }).some(x => x.includes('3')));
    });
});

describe('validateQrcodeCreate', () => {
    it('合法→空数组', () => {
        assert.deepEqual(v.validateQrcodeCreate({ action_name: 'QR_SCENE', action_info: { scene: { scene_id: 1 } } }), []);
    });
    it('缺 action_name→报错', () => {
        assert.ok(v.validateQrcodeCreate({ action_info: {} }).some(x => x.includes('action_name')));
    });
    it('非法 action_name→报错', () => {
        assert.ok(v.validateQrcodeCreate({ action_name: 'BAD', action_info: {} }).some(x => x.includes('QR_SCENE')));
    });
    it('缺 action_info→报错', () => {
        assert.ok(v.validateQrcodeCreate({ action_name: 'QR_SCENE' }).some(x => x.includes('action_info')));
    });
});

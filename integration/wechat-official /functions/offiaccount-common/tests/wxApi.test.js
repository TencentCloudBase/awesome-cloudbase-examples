const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert/strict');

describe('wxApi', () => {
    let originalFetch, envBackup;

    beforeEach(() => {
        envBackup = { appId: process.env.appId, appSecret: process.env.appSecret };
        process.env.appId = 'wx_test';
        process.env.appSecret = 'secret';
        originalFetch = globalThis.fetch;
        ['../utils/wxApi', '../utils/tokenCache', '../config/config']
            .forEach(p => { try { delete require.cache[require.resolve(p)]; } catch {} });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        for (const [k, v] of Object.entries(envBackup)) {
            if (v !== undefined) process.env[k] = v;
            else delete process.env[k];
        }
    });

    it('wxGet 自动注入 access_token', async () => {
        const urls = [];
        globalThis.fetch = async (url) => {
            urls.push(url);
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT_123', expires_in: 7200 }) };
            }
            return { json: async () => ({ errcode: 0, data: 'ok' }) };
        };
        const { wxGet } = require('../utils/wxApi');
        await wxGet('/cgi-bin/user/info', { openid: 'ox_x' });
        const finalUrl = urls[urls.length - 1];
        assert.ok(finalUrl.includes('access_token=AT_123'));
        assert.ok(finalUrl.includes('openid=ox_x'));
    });

    it('wxGet skipToken=true→不注入', async () => {
        const urls = [];
        globalThis.fetch = async (url) => {
            urls.push(url);
            return { json: async () => ({ errcode: 0 }) };
        };
        const { wxGet } = require('../utils/wxApi');
        await wxGet('/sns/auth', { openid: 'x' }, { skipToken: true });
        assert.strictEqual(urls.length, 1, '不应调 token 接口');
        assert.ok(!urls[0].includes('access_token='));
    });

    it('wxPost 自动注入 access_token 到 URL query', async () => {
        let capturedUrl = '';
        let capturedBody = '';
        globalThis.fetch = async (url, opts) => {
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT_P', expires_in: 7200 }) };
            }
            capturedUrl = url;
            capturedBody = opts?.body || '';
            return { json: async () => ({ errcode: 0 }) };
        };
        const { wxPost } = require('../utils/wxApi');
        await wxPost('/cgi-bin/menu/create', { button: [] });
        assert.ok(capturedUrl.includes('access_token=AT_P'));
        assert.ok(capturedBody.includes('button'));
    });

    it('微信返回 errcode≠0→抛错（含 errcode 字段）', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT', expires_in: 7200 }) };
            }
            return { json: async () => ({ errcode: 45009, errmsg: 'api freq out of limit' }) };
        };
        const { wxGet } = require('../utils/wxApi');
        try {
            await wxGet('/cgi-bin/x');
            assert.fail('应抛异常');
        } catch (e) {
            assert.strictEqual(e.errcode, 45009);
            assert.ok(e.message.includes('45009'));
        }
    });

    it('errcode=0→视为成功', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT', expires_in: 7200 }) };
            }
            return { json: async () => ({ errcode: 0, errmsg: 'ok', data: 'result' }) };
        };
        const { wxGet } = require('../utils/wxApi');
        const result = await wxGet('/cgi-bin/x');
        assert.strictEqual(result.data, 'result');
    });

    it('无 errcode 字段→视为成功', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT', expires_in: 7200 }) };
            }
            return { json: async () => ({ openid: 'ox', nickname: 'x' }) };
        };
        const { wxGet } = require('../utils/wxApi');
        const result = await wxGet('/cgi-bin/user/info');
        assert.strictEqual(result.openid, 'ox');
    });
});

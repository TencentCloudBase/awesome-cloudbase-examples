const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert/strict');

/**
 * tokenCache 测试
 * 每个 it 里都 clearCache 并重新 require 模块，避免副作用互相干扰
 */
describe('tokenCache', () => {
    let originalFetch, envBackup;

    beforeEach(() => {
        envBackup = { appId: process.env.appId, appSecret: process.env.appSecret };
        process.env.appId = 'wx_test_appid';
        process.env.appSecret = 'test_secret';
        originalFetch = globalThis.fetch;
        // 清缓存
        try { delete require.cache[require.resolve('../utils/tokenCache')]; } catch {}
        try { delete require.cache[require.resolve('../config/config')]; } catch {}
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        for (const [k, v] of Object.entries(envBackup)) {
            if (v !== undefined) process.env[k] = v;
            else delete process.env[k];
        }
    });

    it('getAccessToken 首次调用→从微信拉取并缓存', async () => {
        let callCount = 0;
        globalThis.fetch = async (url) => {
            callCount++;
            assert.ok(url.includes('client_credential'));
            assert.ok(url.includes('appid=wx_test_appid'));
            return { json: async () => ({ access_token: 'AT_1', expires_in: 7200 }) };
        };
        const { getAccessToken } = require('../utils/tokenCache');
        const t1 = await getAccessToken();
        assert.strictEqual(t1, 'AT_1');
        assert.strictEqual(callCount, 1);
    });

    it('getAccessToken 有效期内→直接返回缓存（不再拉）', async () => {
        let callCount = 0;
        globalThis.fetch = async () => {
            callCount++;
            return { json: async () => ({ access_token: 'AT_X', expires_in: 7200 }) };
        };
        const { getAccessToken } = require('../utils/tokenCache');
        await getAccessToken();
        await getAccessToken();
        await getAccessToken();
        assert.strictEqual(callCount, 1, '应只调 1 次微信接口');
    });

    it('getAccessToken 微信返回 errcode→抛异常', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({ errcode: 40013, errmsg: 'invalid appid' }),
        });
        const { getAccessToken } = require('../utils/tokenCache');
        await assert.rejects(getAccessToken(), /40013/);
    });

    it('getAccessToken 配置缺失→抛异常', async () => {
        delete process.env.appId;
        try { delete require.cache[require.resolve('../utils/tokenCache')]; } catch {}
        try { delete require.cache[require.resolve('../config/config')]; } catch {}
        const { getAccessToken } = require('../utils/tokenCache');
        await assert.rejects(getAccessToken(), /appId/);
    });

    it('getStableAccessToken 首次→POST 拉取', async () => {
        let method = '';
        let bodyStr = '';
        globalThis.fetch = async (url, opts) => {
            method = opts?.method || 'GET';
            bodyStr = opts?.body || '';
            return { json: async () => ({ access_token: 'ST_1', expires_in: 7200 }) };
        };
        const { getStableAccessToken } = require('../utils/tokenCache');
        const t = await getStableAccessToken();
        assert.strictEqual(t, 'ST_1');
        assert.strictEqual(method, 'POST');
        assert.ok(bodyStr.includes('wx_test_appid'));
    });

    it('getStableAccessToken forceRefresh=true→跳过缓存', async () => {
        let count = 0;
        globalThis.fetch = async () => {
            count++;
            return { json: async () => ({ access_token: 'ST_' + count, expires_in: 7200 }) };
        };
        const { getStableAccessToken } = require('../utils/tokenCache');
        await getStableAccessToken();
        await getStableAccessToken(true);  // 强制刷新
        assert.strictEqual(count, 2);
    });

    it('getJsapiTicket 会先拿 access_token 再拿 ticket', async () => {
        const urls = [];
        globalThis.fetch = async (url) => {
            urls.push(url);
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT_abc', expires_in: 7200 }) };
            }
            if (url.includes('/ticket/getticket')) {
                return { json: async () => ({ errcode: 0, ticket: 'TICKET_xyz', expires_in: 7200 }) };
            }
            throw new Error('Unknown URL: ' + url);
        };
        const { getJsapiTicket } = require('../utils/tokenCache');
        const tk = await getJsapiTicket();
        assert.strictEqual(tk, 'TICKET_xyz');
        assert.strictEqual(urls.length, 2);
        assert.ok(urls[0].includes('/cgi-bin/token'));
        assert.ok(urls[1].includes('/ticket/getticket'));
        assert.ok(urls[1].includes('access_token=AT_abc'));
    });

    it('getJsapiTicket 微信返回 errcode≠0→抛异常', async () => {
        globalThis.fetch = async (url) => {
            if (url.includes('/cgi-bin/token')) {
                return { json: async () => ({ access_token: 'AT', expires_in: 7200 }) };
            }
            return { json: async () => ({ errcode: 40001, errmsg: 'invalid credential' }) };
        };
        const { getJsapiTicket } = require('../utils/tokenCache');
        await assert.rejects(getJsapiTicket(), /40001/);
    });
});

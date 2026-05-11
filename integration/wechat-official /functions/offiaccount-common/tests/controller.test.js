const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert/strict');

function mockReqRes(body) {
    return {
        req: { body: body || {}, headers: {} },
        res: {
            _status: null, _body: null,
            status(code) { this._status = code; return this; },
            json(data) { this._body = data; return this; },
        },
    };
}

describe('oauthController', () => {
    let originalFetch, envBackup;

    beforeEach(() => {
        envBackup = { OA_APPID: process.env.OA_APPID, OA_APPSECRET: process.env.OA_APPSECRET };
        process.env.OA_APPID = 'wx_test';
        process.env.OA_APPSECRET = 'secret';
        originalFetch = globalThis.fetch;
        ['../controllers/oauthController', '../config/config']
            .forEach(p => { try { delete require.cache[require.resolve(p)]; } catch {} });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        for (const [k, v] of Object.entries(envBackup)) {
            if (v !== undefined) process.env[k] = v;
            else delete process.env[k];
        }
    });

    it('getInfo 齐全→200 返回 appId', async () => {
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes();
        await ctrl.getInfo(req, res);
        assert.strictEqual(res._status, 200);
        assert.strictEqual(res._body.code, 0);
        assert.strictEqual(res._body.data.appId, 'wx_test');
    });

    it('getInfo 缺 APPID→fail', async () => {
        delete process.env.OA_APPID;
        try { delete require.cache[require.resolve('../controllers/oauthController')]; } catch {}
        try { delete require.cache[require.resolve('../config/config')]; } catch {}
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes();
        await ctrl.getInfo(req, res);
        assert.strictEqual(res._body.code, -1);
    });

    it('exchangeCode 正常流程', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({
                openid: 'ox_abc',
                access_token: 'at_x',
                refresh_token: 'rt_x',
                expires_in: 7200,
                scope: 'snsapi_base',
                unionid: 'un_x',
            }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ code: 'valid_code' });
        await ctrl.exchangeCode(req, res);
        assert.strictEqual(res._status, 200);
        assert.strictEqual(res._body.data.openid, 'ox_abc');
        assert.strictEqual(res._body.data.unionid, 'un_x');
    });

    it('exchangeCode 缺 code→400', async () => {
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({});
        await ctrl.exchangeCode(req, res);
        assert.strictEqual(res._status, 400);
    });

    it('exchangeCode 微信 errcode→fail', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({ errcode: 40029, errmsg: 'invalid code' }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ code: 'bad' });
        await ctrl.exchangeCode(req, res);
        assert.strictEqual(res._body.code, -1);
        assert.ok(res._body.msg.includes('40029'));
    });

    it('refreshToken 正常', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({
                openid: 'ox_x',
                access_token: 'new_at',
                refresh_token: 'new_rt',
                expires_in: 7200,
                scope: 'snsapi_base',
            }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ refresh_token: 'old_rt' });
        await ctrl.refreshToken(req, res);
        assert.strictEqual(res._status, 200);
        assert.strictEqual(res._body.data.access_token, 'new_at');
    });

    it('refreshToken 缺参→400', async () => {
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({});
        await ctrl.refreshToken(req, res);
        assert.strictEqual(res._status, 400);
    });

    it('getUserinfo 正常', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({ openid: 'ox', nickname: '张三', headimgurl: 'http://x' }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ access_token: 'at', openid: 'ox' });
        await ctrl.getUserinfo(req, res);
        assert.strictEqual(res._status, 200);
        assert.strictEqual(res._body.data.nickname, '张三');
    });

    it('getUserinfo 缺参→fail', async () => {
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({});
        await ctrl.getUserinfo(req, res);
        assert.strictEqual(res._body.code, -1);
    });

    it('verifyToken errcode=0→valid=true', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({ errcode: 0, errmsg: 'ok' }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ access_token: 'at', openid: 'ox' });
        await ctrl.verifyToken(req, res);
        assert.strictEqual(res._body.data.valid, true);
    });

    it('verifyToken errcode≠0→valid=false', async () => {
        globalThis.fetch = async () => ({
            json: async () => ({ errcode: 40001, errmsg: 'invalid token' }),
        });
        const ctrl = require('../controllers/oauthController');
        const { req, res } = mockReqRes({ access_token: 'at', openid: 'ox' });
        await ctrl.verifyToken(req, res);
        assert.strictEqual(res._body.data.valid, false);
        assert.strictEqual(res._body.data.errcode, 40001);
    });
});

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert/strict');

describe('config', () => {
    let backup;
    beforeEach(() => {
        backup = { OA_APPID: process.env.OA_APPID, OA_APPSECRET: process.env.OA_APPSECRET };
        try { delete require.cache[require.resolve('../config/config')]; } catch {}
    });
    afterEach(() => {
        for (const [k, v] of Object.entries(backup)) {
            if (v !== undefined) process.env[k] = v;
            else delete process.env[k];
        }
    });

    it('齐全→validateConfig 无警告', () => {
        process.env.OA_APPID = 'wx_x';
        process.env.OA_APPSECRET = 'sec';
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.deepEqual(errors, []);
    });

    it('缺 APPID→errors 包含提示', () => {
        delete process.env.OA_APPID;
        process.env.OA_APPSECRET = 'sec';
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.ok(errors.some(x => x.includes('OA_APPID')));
    });

    it('缺 APPSECRET→errors 包含提示', () => {
        process.env.OA_APPID = 'wx_x';
        delete process.env.OA_APPSECRET;
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.ok(errors.some(x => x.includes('OA_APPSECRET')));
    });

    it('全缺→errors 含两条', () => {
        delete process.env.OA_APPID;
        delete process.env.OA_APPSECRET;
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.strictEqual(errors.length, 2);
    });

    it('APPSECRET 含 \\n 转义→被转为换行', () => {
        process.env.OA_APPID = 'wx_x';
        process.env.OA_APPSECRET = 'line1\\nline2';
        const cfg = require('../config/config');
        assert.strictEqual(cfg.appSecret, 'line1\nline2');
    });
});

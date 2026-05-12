const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('assert/strict');

describe('config', () => {
    let backup;
    beforeEach(() => {
        backup = { appId: process.env.appId, appSecret: process.env.appSecret };
        try { delete require.cache[require.resolve('../config/config')]; } catch {}
    });
    afterEach(() => {
        for (const [k, v] of Object.entries(backup)) {
            if (v !== undefined) process.env[k] = v;
            else delete process.env[k];
        }
    });

    it('齐全→validateConfig 无警告', () => {
        process.env.appId = 'wx_x';
        process.env.appSecret = 'sec';
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.deepEqual(errors, []);
    });

    it('缺 appId→errors 包含提示', () => {
        delete process.env.appId;
        process.env.appSecret = 'sec';
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.ok(errors.some(x => x.includes('appId')));
    });

    it('缺 appSecret→errors 包含提示', () => {
        process.env.appId = 'wx_x';
        delete process.env.appSecret;
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.ok(errors.some(x => x.includes('appSecret')));
    });

    it('全缺→errors 含两条', () => {
        delete process.env.appId;
        delete process.env.appSecret;
        const { validateConfig } = require('../config/config');
        const errors = validateConfig();
        assert.strictEqual(errors.length, 2);
    });

    it('appSecret 含 \\n 转义→被转为换行', () => {
        process.env.appId = 'wx_x';
        process.env.appSecret = 'line1\\nline2';
        const cfg = require('../config/config');
        assert.strictEqual(cfg.appSecret, 'line1\nline2');
    });
});

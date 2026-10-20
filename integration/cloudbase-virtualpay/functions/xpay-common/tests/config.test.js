const test = require('node:test');
const assert = require('node:assert');

const CONFIG_PATH = require.resolve('../config/config');

// config.js 在模块加载时读 process.env，所以每次都要清缓存重新加载
const ENV_KEYS = [
    'appKey', 'prodAppKey', 'secret', 'appSecret',
    'offerId', 'appId', 'appid', 'APP_ID', 'WX_APP_ID', 'notifyFormat',
];

/**
 * 模拟一组环境变量并重新加载 config
 * @param {Object} env
 */
function loadConfig(env) {
    delete require.cache[CONFIG_PATH];
    ENV_KEYS.forEach(k => { delete process.env[k]; });
    Object.assign(process.env, env);
    return require(CONFIG_PATH);
}

test('平台注入名（appKey / secret）能被正确读取', () => {
    const { xpayConfig, getAppKey } = loadConfig({
        appKey: 'key_from_platform',
        secret: 'secret_from_platform',
    });

    assert.strictEqual(xpayConfig.appKey, 'key_from_platform');
    assert.strictEqual(xpayConfig.appSecret, 'secret_from_platform');
    assert.strictEqual(getAppKey(), 'key_from_platform');
});

test('本地/旧命名（prodAppKey / appSecret）仍可回退', () => {
    const { xpayConfig, getAppKey } = loadConfig({
        prodAppKey: 'key_from_env',
        appSecret: 'secret_from_env',
    });

    assert.strictEqual(xpayConfig.appKey, 'key_from_env');
    assert.strictEqual(xpayConfig.appSecret, 'secret_from_env');
    assert.strictEqual(getAppKey(), 'key_from_env');
});

test('平台注入名优先于本地旧名', () => {
    const { xpayConfig } = loadConfig({
        appKey: 'key_from_platform',
        prodAppKey: 'key_from_env',
        secret: 'secret_from_platform',
        appSecret: 'secret_from_env',
    });

    assert.strictEqual(xpayConfig.appKey, 'key_from_platform');
    assert.strictEqual(xpayConfig.appSecret, 'secret_from_platform');
});

test('appKey 缺失时 getAppKey 直接抛错，不静默兜底', () => {
    const { getAppKey } = loadConfig({});
    assert.throws(() => getAppKey(), /appKey/);
});

test('secret 缺失时 validateConfig 报警但不抛错', () => {
    const { validateConfig } = loadConfig({ offerId: 'offer_1', appId: 'wx_test', appKey: 'k' });

    const errors = validateConfig();
    assert.ok(errors.some(e => e.includes('secret')), '应告警 secret 未配置');
    assert.ok(!errors.some(e => e.includes('appKey')), 'appKey 已配置不应告警');
});

test('env 恒为 0（现网），且作为协议字段导出', () => {
    const { env } = loadConfig({ xpayEnv: '1' });
    assert.strictEqual(env, 0, 'xpayEnv 环境变量已废弃，不应影响 env 取值');
});

test('appId 键名容错：appId / appid / APP_ID 都能读到', () => {
    assert.strictEqual(loadConfig({ appId: 'wx_camel' }).xpayConfig.appId, 'wx_camel');
    assert.strictEqual(loadConfig({ appid: 'wx_lower' }).xpayConfig.appId, 'wx_lower');
    assert.strictEqual(loadConfig({ APP_ID: 'wx_upper' }).xpayConfig.appId, 'wx_upper');
});

test('appId 与 secret 同时为空时，validateConfig 各报一条', () => {
    const { validateConfig } = loadConfig({ offerId: 'o', appKey: 'k' });
    const errors = validateConfig();
    assert.ok(errors.some(e => e.includes('appId')), '应告警 appId 未配置');
    assert.ok(errors.some(e => e.includes('secret')), '应告警 secret 未配置');
});

test('createOrder 缺 appId 时明确报错，不发起网络请求', async () => {
    delete require.cache[require.resolve('../services/xpayService')];
    const { xpayConfig } = loadConfig({ offerId: 'o', appKey: 'k', secret: 's' });
    assert.strictEqual(xpayConfig.appId, '', '前置条件：appId 为空');

    const XpayService = require('../services/xpayService');
    const service = new XpayService();

    await assert.rejects(
        () => service.createOrder({ code: 'fake_code', productId: 'p_1', goodsPrice: 100 }),
        /缺少 appId/
    );
});
// 裸单词（USER / LANG / MAIL / TERM）曾被当成前缀，连带过滤掉 USER_TOKEN、
// MAILGUN_KEY 这类业务变量 —— 而这份清单是排查「平台注入了哪些名字」的唯一依据
test('⚠️ 环境变量清单：业务变量不能被当成系统变量过滤', () => {
    const { otherEnvKeys, isSystemKey } = loadConfig({
        USER_TOKEN: 'x',
        MAILGUN_KEY: 'x',
        USERS_DB: 'x',
        LANGUAGES: 'x',
        TERMUX: 'x',
    });

    const keys = otherEnvKeys();
    ['USER_TOKEN', 'MAILGUN_KEY', 'USERS_DB', 'LANGUAGES', 'TERMUX'].forEach((k) => {
        assert.ok(keys.includes(k), `${k} 不应被过滤`);
    });

    // 真正的系统变量仍然要过滤
    assert.strictEqual(isSystemKey('USER'), true);
    assert.strictEqual(isSystemKey('PATH'), true);
    assert.strictEqual(isSystemKey('TENCENTCLOUD_RUNENV'), true);
    assert.strictEqual(isSystemKey('USER_TOKEN'), false);
});

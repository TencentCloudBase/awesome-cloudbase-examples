const test = require('node:test');
const assert = require('node:assert');

const CONFIG_PATH = require.resolve('../config/config');

// config.js 在模块加载时读 process.env，所以每次都要清缓存重新加载
const ENV_KEYS = [
    'appKey', 'prodAppKey', 'secret', 'appSecret',
    'offerId', 'appId', 'appid', 'APP_ID', 'WX_APP_ID',
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

// ========== 联调闸门 XPAY_GUARD（与 wx-pay 的 PAY_GUARD 同一套心智）==========

test('guardOff：只有显式 off 才是联调模式', () => {
    const c = loadConfig({});
    const cases = [['off', true], [' OFF ', true], ['on', false], ['true', false], ['', false]];
    for (const [v, expected] of cases) {
        process.env.XPAY_GUARD = v;
        assert.strictEqual(c.guardOff(), expected, `XPAY_GUARD="${v}"`);
    }
    delete process.env.XPAY_GUARD;
    assert.strictEqual(c.guardOff(), false, '漏配必须是 on（安全侧）');
});

test('shouldRefuseBoot：只有「云上 + off + 未许可」才拒绝启动', () => {
    const { shouldRefuseBoot } = loadConfig({});
    const CLOUD = { SCF_RUNTIME: 'Nodejs24.11' };

    assert.strictEqual(shouldRefuseBoot({ XPAY_GUARD: 'off' }), false, '本地 off 必须放行（npm run dev）');
    assert.strictEqual(shouldRefuseBoot({}), false);
    assert.strictEqual(shouldRefuseBoot({ ...CLOUD, XPAY_GUARD: 'off' }), true, '云上 off 必须拒绝');
    assert.strictEqual(
        shouldRefuseBoot({ TENCENTCLOUD_RUNENV: 'cloudrun', XPAY_GUARD: 'off' }), true);
    assert.strictEqual(shouldRefuseBoot({ ...CLOUD, XPAY_GUARD: 'on' }), false);
    assert.strictEqual(shouldRefuseBoot({ ...CLOUD }), false);
    assert.strictEqual(
        shouldRefuseBoot({ ...CLOUD, XPAY_GUARD: 'off', PAY_ALLOW_INSECURE_BOOT: 'true' }), false,
        '云上联调逃生舱');
    assert.strictEqual(
        shouldRefuseBoot({ ...CLOUD, XPAY_GUARD: ' OFF ', PAY_ALLOW_INSECURE_BOOT: ' TRUE ' }), false,
        '大小写 / 空格不影响判定');
});

// ========== 回调声明字段：URL 全大写口径（兼容历史小写）==========

const NOTIFY_KEYS = [
    'notifyURLCallbackType', 'notifyUrlCallbackType',
    'notifyURLResourceType', 'notifyUrlResourceType',
    'notifyURLResourceName', 'notifyUrlResourceName',
    'msgEncryptType',
];

/** 隔离 notify* 环境变量，用例结束后恢复（避免与其它用例互相污染） */
function withNotifyEnv(env, fn) {
    const saved = {};
    NOTIFY_KEYS.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; });
    Object.assign(process.env, env);
    try {
        return fn();
    } finally {
        NOTIFY_KEYS.forEach((k) => {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        });
    }
}

test('notifyURLCallbackType（URL 全大写）能被读取，取值大小写归一', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv({ notifyURLCallbackType: 'SYSTEM' }, () => getCallbackConfig());
    assert.strictEqual(cb.type, 'system');
});

test('notifyURLResourceType（URL 全大写）能被读取', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv({ notifyURLResourceType: 'cloudrun' }, () => getCallbackConfig());
    assert.strictEqual(cb.resource, 'cloudrun');
});

test('历史小写写法仍兼容（平台若注入旧名，回调不能全挂）', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv({ notifyUrlCallbackType: 'ownservice' }, () => getCallbackConfig());
    assert.strictEqual(cb.type, 'ownservice');
});

test('大小写同时存在且冲突时，大写为准', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv(
        { notifyURLCallbackType: 'system', notifyUrlCallbackType: 'ownservice' },
        () => getCallbackConfig()
    );
    assert.strictEqual(cb.type, 'system', '不能被旧名反向覆盖');
});

test('大写是空串/空白时回退小写（空值不遮蔽有效值）', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv(
        { notifyURLCallbackType: '   ', notifyUrlCallbackType: 'system' },
        () => getCallbackConfig()
    );
    assert.strictEqual(cb.type, 'system');
});

test('两个都不配 → 空串（= 自己验签，fail closed）', () => {
    const { getCallbackConfig } = loadConfig({});
    const cb = withNotifyEnv({}, () => getCallbackConfig());
    assert.strictEqual(cb.type, '');
    assert.strictEqual(cb.resource, '');
});

// ========== 声明来源诊断：必须与 readNotifyEnv 同口径（trim 后非空）==========

test('resolver：大写有值 → 判定为大写', () => {
    const { resolveNotifySource } = loadConfig({});
    const s = resolveNotifySource('system', 'ownservice');
    assert.strictEqual(s.name, 'notifyURLCallbackType');
    assert.strictEqual(s.value, 'system');
    assert.strictEqual(s.fellBackFromEmptyUpper, false);
});

test('resolver：大写注入空串 → 回落小写并标记（不能谎报大写生效）', () => {
    const { resolveNotifySource } = loadConfig({});
    const s = resolveNotifySource('', 'system');
    assert.match(s.name, /notifyUrlCallbackType/);
    assert.strictEqual(s.value, 'system');
    assert.strictEqual(s.fellBackFromEmptyUpper, true);
});

test('resolver：大写注入纯空格 → 同样回落并标记', () => {
    const { resolveNotifySource } = loadConfig({});
    const s = resolveNotifySource('   ', 'system');
    assert.strictEqual(s.value, 'system');
    assert.strictEqual(s.fellBackFromEmptyUpper, true);
});

test('resolver：大写未注入（undefined）→ 回落小写但不标记 fallback', () => {
    const { resolveNotifySource } = loadConfig({});
    const s = resolveNotifySource(undefined, 'system');
    assert.strictEqual(s.value, 'system');
    assert.strictEqual(s.fellBackFromEmptyUpper, false);
});

test('resolver：都未配置 → (未注入)', () => {
    const { resolveNotifySource } = loadConfig({});
    assert.strictEqual(resolveNotifySource(undefined, '').name, '(未注入)');
});

test('🚨 诊断口径 == 生效口径：大写空串 + 小写 system 时，日志指向小写，行为也是 system', () => {
    const { resolveNotifySource, getCallbackConfig } = loadConfig({});
    const r = withNotifyEnv(
        { notifyURLCallbackType: '', notifyUrlCallbackType: 'system' },
        () => ({
            src: resolveNotifySource(
                process.env.notifyURLCallbackType,
                process.env.notifyUrlCallbackType
            ),
            cb: getCallbackConfig(),
        })
    );
    assert.strictEqual(r.cb.type, 'system', '实际生效值');
    assert.match(r.src.name, /notifyUrlCallbackType/, '日志必须指向真正生效的变量');
    assert.strictEqual(r.src.value, 'system');
});

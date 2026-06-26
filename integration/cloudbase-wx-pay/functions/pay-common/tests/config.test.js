/**
 * config.js validateConfig 单元测试
 * 运行：node --test tests/config.test.js
 *
 * validateConfig 依赖 process.env，每个用例需独立设置/清理环境变量
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// 必须在 require 前保存原始 env，避免污染
const ORIGINAL_ENV = { ...process.env };

// 动态 require：每次测试前重新加载模块以获取最新 env
function loadConfig() {
    // 清除模块缓存
    delete require.cache[require.resolve('../config/config')];
    return require('../config/config');
}

describe('validateConfig', () => {

    afterEach(() => {
        // 恢复原始环境变量
        Object.keys(process.env).forEach(key => {
            if (!(key in ORIGINAL_ENV)) {
                delete process.env[key];
            }
        });
        for (const [key, val] of Object.entries(ORIGINAL_ENV)) {
            process.env[key] = val;
        }
        // 清除缓存确保下次重新加载
        delete require.cache[require.resolve('../config/config')];
    });

    // ========== 完整合法配置 ==========

    it('完整合法配置 → 返回空数组', () => {
        process.env.appId = 'wx_test_appid';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'abcdefghijklmnopqrstuvwxyz123456';
        process.env.merchantSerialNumber = 'ABC123DEF456';
        process.env.privateKey = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
        process.env.signMode = 'sdk';
        process.env.notifyURLPayURL = 'https://example.com/pay/callback';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.deepStrictEqual(errors, []);
    });

    // ========== 通用必填项缺失 ==========

    it('appId 和 serviceAppId 都缺 → 报错', () => {
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('appId') && e.includes('serviceAppId')));
    });

    it('merchantId 缺失 → 报错', () => {
        process.env.appId = 'wx_test';
        // merchantId 不设置
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('merchantId')));
    });

    it('apiV3Key 缺失 → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        // apiV3Key 不设置
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('apiV3Key')));
    });

    it('merchantSerialNumber 缺失 → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        // merchantSerialNumber 不设置
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('merchantSerialNumber')));
    });

    it('privateKey 缺失 → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        // privateKey 不设置

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('privateKey')));
    });

    // ========== 回调 URL 格式校验 ==========

    it('回调 URL 使用 http://（非 https）→ 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.notifyURLPayURL = 'http://example.com/callback'; // http 而非 https

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('notifyURLPayURL') && e.includes('https://')));
    });

    it('回调 URL 包含 localhost → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.notifyURLPayURL = 'https://localhost/pay/callback';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('localhost')));
    });

    it('回调 URL 包含参数 ? → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.notifyURLPayURL = 'https://example.com/callback?token=xxx';

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('?')));
    });

    // ========== signMode 校验 ==========

    it('signMode 无效值 → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.signMode = 'invalid_mode'; // 非法值

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('signMode') && e.includes('无效')));
    });

    // ========== 公钥模式关联校验 ==========

    it('公钥模式：配置了 wxPayPublicKey 但未配置 wxPayPublicKeyId → 报错', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.wxPayPublicKey = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
        // wxPayPublicKeyId 不设置

        const config = loadConfig();
        const errors = config.validateConfig();
        assert.ok(errors.some(e => e.includes('wxPayPublicKeyId')));
    });

    it('公钥模式：同时配置 wxPayPublicKey + wxPayPublicKeyId → 无此错误', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        process.env.wxPayPublicKey = '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----';
        process.env.wxPayPublicKeyId = 'PUB_KEY_ID_001';

        const config = loadConfig();
        const errors = config.validateConfig();
        // 不应有 wxPayPublicKeyId 相关的错误
        assert.ok(!errors.some(e => e.includes('wxPayPublicKeyId')));
    });

    // ========== 默认值回退 ==========

    it('不设 signMode → 默认为 gateway', () => {
        delete process.env.signMode;
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        assert.strictEqual(config.signMode, 'gateway');
    });

    it('不设 wxPayPublicKey → verifyMode 为 certificate', () => {
        delete process.env.wxPayPublicKey;
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        assert.strictEqual(config.verifyMode, 'certificate');
    });

    it('设了 wxPayPublicKey → verifyMode 为 publickey', () => {
        process.env.wxPayPublicKey = 'some_public_key_content';
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';

        const config = loadConfig();
        assert.strictEqual(config.verifyMode, 'publickey');
    });

    // ========== 私钥换行符处理 ==========

    it('privateKey 含 \\n 字面量 → 自动转换为真实换行', () => {
        process.env.privateKey = '-----BEGIN PRIVATE KEY-----\\ntest_line\\n-----END PRIVATE KEY-----';
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';

        const config = loadConfig();
        // 应包含真实的换行符而非字面 \n
        assert.ok(config.payConfig.mchPrivateKey.includes('\n'));
        assert.ok(!config.payConfig.mchPrivateKey.includes('\\n'));
    });

    // ========== 多错误累积 ==========

    it('多个字段缺失 → 返回所有错误', () => {
        // 全部不设
        delete process.env.appId;
        delete process.env.service_app_id;
        delete process.env.merchantId;
        delete process.env.apiV3Key;
        delete process.env.merchantSerialNumber;
        delete process.env.privateKey;

        const config = loadConfig();
        const errors = config.validateConfig();
        // 至少应报出通用必填项的错误
        assert.ok(errors.length >= 5);
    });

    it('回调 URL 为空时不做格式校验（仅在有值时检查）', () => {
        process.env.appId = 'wx_test';
        process.env.merchantId = '1234567890';
        process.env.apiV3Key = 'test_key_32_bytes_long!!';
        process.env.merchantSerialNumber = 'ABC123';
        process.env.privateKey = 'test_key';
        // notifyURLPayURL 不设置（为空字符串）

        const config = loadConfig();
        const errors = config.validateConfig();
        // 不应有 URL 格式相关的错误
        assert.ok(!errors.some(e => e.includes('https://') || e.includes('localhost') || e.includes('?')));
    });
});

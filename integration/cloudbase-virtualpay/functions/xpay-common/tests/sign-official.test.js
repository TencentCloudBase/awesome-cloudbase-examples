/**
 * 官方签名算法基准测试（golden test）
 *
 * 数据取自微信官方文档「虚拟支付 → 2.6 参考的 Python 脚本」：
 *   uri         = /xpay/query_user_balance
 *   appkey      = 12345
 *   post_body   = {"openid": "xxx", "user_ip": "127.0.0.1", "env": 0}
 *   session_key = 9hAb/NEYUlkaMBEsmFgzig==
 *
 * 期望值是官方脚本里 assert 写死的，算法一旦被改坏这里立刻红 ——
 * 不用再靠联调一个个试错。
 *
 * ⚠️ 官方强调：post_body 必须与实际发出的 HTTP 请求体**逐字节一致**
 *    （包括空格、键顺序）。所以这里直接用字面字符串，不用 JSON.stringify。
 */

// config 在模块加载时读 process.env，必须在 require 之前设置
process.env.offerId = 'test_offer';
process.env.appKey = '12345';
process.env.appId = 'wx_test_appid';
process.env.secret = 'test_secret';

const test = require('node:test');
const assert = require('node:assert');

const { signForServer } = require('../services/signService');

const URI = '/xpay/query_user_balance';
// 注意：带空格，且字段顺序是 openid → user_ip → env
const POST_BODY = '{"openid": "xxx", "user_ip": "127.0.0.1", "env": 0}';
const SESSION_KEY = '9hAb/NEYUlkaMBEsmFgzig==';

// 官方断言基准值
const OFFICIAL_PAY_SIG = 'c37809f27c6d7fd1837ad2500a04512b66b34fd793a39a385fade56dca89a4b5';
const OFFICIAL_SIGNATURE = '089d9e8dc5d308977360c4b79ec600a93d736802802a807d634192328032f6c7';

test('paySig = HMAC-SHA256(appKey, uri + "&" + post_body)，与官方脚本一致', () => {
    const { paySig } = signForServer(URI, POST_BODY, SESSION_KEY);
    assert.strictEqual(paySig, OFFICIAL_PAY_SIG);
});

test('signature = HMAC-SHA256(sessionKey, post_body)，与官方脚本一致', () => {
    const { signature } = signForServer(URI, POST_BODY, SESSION_KEY);
    assert.strictEqual(signature, OFFICIAL_SIGNATURE);
});

test('uri 带 query 会让 paySig 失配（官方明确要求去掉 ? 及其后内容）', () => {
    const { paySig: withQuery } = signForServer(
        `${URI}?access_token=xxx`, POST_BODY, SESSION_KEY
    );
    assert.notStrictEqual(withQuery, OFFICIAL_PAY_SIG, 'uri 带 query 应导致签名不一致');
});

test('post_body 被重新序列化（键顺序/空格变化）会导致签名失配', () => {
    const reserialized = JSON.stringify({ openid: 'xxx', user_ip: '127.0.0.1', env: 0 });
    const { paySig } = signForServer(URI, reserialized, SESSION_KEY);
    assert.notStrictEqual(paySig, OFFICIAL_PAY_SIG, '重新序列化后签名必须变化');
});

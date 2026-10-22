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

// ============================================================
//  C 端（wx.requestVirtualPayment）基准
//
//  B 端有官方脚本的 assert 值，C 端官方没有给现成向量，所以这里用
//  「固定期望值 + 独立 crypto 重算」双重钉住：
//    - 固定值：实现被改动时立刻红（包括 CLIENT_PAY_URI 被改）
//    - 独立重算：期望值本身写错、或拼接符/uri 变了也会红
//
//  🚨 CLIENT_PAY_URI 写错的后果是**所有下单验签失败**，而错误信息只报
//     「签名错误」，完全不指向这个常量 —— 所以它必须有独立断言。
// ============================================================

const crypto = require('crypto');
const { signForClient, CLIENT_PAY_URI } = require('../services/signService');

const CLIENT_SESSION_KEY = '9hAb/NEYUlkaMBEsmFgzig==';
const CLIENT_SIGN_DATA = '{"offerId":"test_offer","buyQuantity":1,"env":0,"currencyType":"CNY",'
    + '"productId":"prod_001","goodsPrice":100,"outTradeNo":"CLIENT20261022001",'
    + '"attach":"CLIENT20261022001"}';

const CLIENT_EXPECTED_PAY_SIG = '98ce07af6ad3964cb10f05fbb1807fec820036f58bcc5e5a155cd6f410da3386';
const CLIENT_EXPECTED_SIGNATURE = '4637f79f2670477e59518681e8a9b3b3da50d6483d53b83e2f808179ab15d94e';

test('C 端 paySig 的 uri 固定为 requestVirtualPayment（官方约定）', () => {
    assert.strictEqual(CLIENT_PAY_URI, 'requestVirtualPayment');
});

test('C 端 paySig = HMAC-SHA256(appKey, "requestVirtualPayment&" + signData)', () => {
    const { paySig } = signForClient(CLIENT_SIGN_DATA, CLIENT_SESSION_KEY);

    assert.strictEqual(paySig, CLIENT_EXPECTED_PAY_SIG);

    // 独立重算：不经过 signForClient，直接把官方公式写进用例
    const independent = crypto.createHmac('sha256', '12345')
        .update(`requestVirtualPayment&${CLIENT_SIGN_DATA}`, 'utf8')
        .digest('hex');
    assert.strictEqual(paySig, independent, 'uri 或拼接符被改动时签名会失配');
});

test('C 端 signature = HMAC-SHA256(sessionKey, signData)', () => {
    const { signature } = signForClient(CLIENT_SIGN_DATA, CLIENT_SESSION_KEY);
    assert.strictEqual(signature, CLIENT_EXPECTED_SIGNATURE);

    const independent = crypto.createHmac('sha256', CLIENT_SESSION_KEY)
        .update(CLIENT_SIGN_DATA, 'utf8')
        .digest('hex');
    assert.strictEqual(signature, independent);
});

test('C 端 signData 原样返回：不能被重新序列化（否则客户端签出的基串与签名不一致）', () => {
    const { signData, mode } = signForClient(CLIENT_SIGN_DATA, CLIENT_SESSION_KEY);
    assert.strictEqual(signData, CLIENT_SIGN_DATA);
    assert.strictEqual(mode, 'short_series_goods');
});

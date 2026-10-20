const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

// 用集成中心注入的变量名（appKey / secret），与线上保持一致
process.env.offerId = 'test_offer_123';
process.env.appKey = 'test_app_key_abcdef';
process.env.appId = 'wx_test_appid';
process.env.secret = 'test_secret';

const { getAppKey } = require('../config/config');
const {
    MODE,
    hmacSha256,
    buildSignData,
    signForClient,
    signForServer,
    generateOutTradeNo,
    validateOutTradeNo,
} = require('../services/signService');

const baseParams = {
    offerId: 'test_offer_123',
    buyQuantity: 1,
    env: 0,
    productId: 'product_001',
    goodsPrice: 100,
    outTradeNo: 'ORDER20261014001',
    attach: 'uid=123',
};

test('buildSignData：币种固定 CNY，键顺序稳定', () => {
    const sd = buildSignData(baseParams);
    const obj = JSON.parse(sd);

    assert.strictEqual(obj.currencyType, 'CNY');
    assert.strictEqual(obj.env, 0);
    assert.strictEqual(obj.goodsPrice, 100);

    // 键顺序
    assert.deepStrictEqual(Object.keys(obj), [
        'offerId', 'buyQuantity', 'env', 'currencyType',
        'productId', 'goodsPrice', 'outTradeNo', 'attach',
    ]);
});

test('buildSignData：代币充值不带 productId / goodsPrice', () => {
    const sd = buildSignData({ ...baseParams, mode: MODE.COIN });
    const obj = JSON.parse(sd);

    assert.strictEqual(obj.productId, undefined);
    assert.strictEqual(obj.goodsPrice, undefined);
    assert.strictEqual(obj.buyQuantity, 1);
});

test('C 端 paySig：uri 固定为 requestVirtualPayment', () => {
    const sd = buildSignData(baseParams);
    const sessionKey = 'session_key_xyz';
    const { paySig, signature } = signForClient(sd, sessionKey);

    const expectPaySig = crypto
        .createHmac('sha256', getAppKey())
        .update(`requestVirtualPayment&${sd}`, 'utf8')
        .digest('hex');
    const expectSignature = crypto
        .createHmac('sha256', sessionKey)
        .update(sd, 'utf8')
        .digest('hex');

    assert.strictEqual(paySig, expectPaySig);
    assert.strictEqual(signature, expectSignature);
});

test('B 端 paySig：uri 为实际接口路径', () => {
    const uri = '/xpay/query_order';
    const postBody = JSON.stringify({ openid: 'o1', offer_id: 'x', env: 0 });

    const { paySig, signature } = signForServer(uri, postBody, 'session_key_xyz');

    const expectPaySig = crypto
        .createHmac('sha256', getAppKey())
        .update(`${uri}&${postBody}`, 'utf8')
        .digest('hex');

    assert.strictEqual(paySig, expectPaySig);

    const expectSignature = crypto
        .createHmac('sha256', 'session_key_xyz')
        .update(postBody, 'utf8')
        .digest('hex');
    assert.strictEqual(signature, expectSignature);
});

test('⚠️ 键顺序改变会导致签名完全不同（为什么必须用原样字符串）', () => {
    const a = JSON.stringify({ offerId: 'x', buyQuantity: 1 });
    const b = JSON.stringify({ buyQuantity: 1, offerId: 'x' });

    assert.notStrictEqual(hmacSha256('key', a), hmacSha256('key', b));
});

test('缺少 sessionKey 时签名直接抛错', () => {
    const sd = buildSignData(baseParams);
    assert.throws(() => signForClient(sd, null), /缺少 sessionKey/);
    assert.throws(() => signForServer('/xpay/query_order', '{}', ''), /缺少 sessionKey/);
});

test('outTradeNo：长度 8-32 位，不能下划线开头', () => {
    assert.strictEqual(validateOutTradeNo('ORDER001'), null);
    assert.ok(validateOutTradeNo('SHORT') !== null, '小于 8 位应报错');
    assert.ok(validateOutTradeNo('_INVALID12345') !== null, '下划线开头应报错');
    assert.ok(validateOutTradeNo('A'.repeat(33)) !== null, '超过 32 位应报错');
});

test('generateOutTradeNo：长度合法且不以下划线开头', () => {
    const no = generateOutTradeNo();
    assert.strictEqual(validateOutTradeNo(no), null);
    assert.ok(no.length >= 8 && no.length <= 32);
    assert.ok(!no.startsWith('_'));
});

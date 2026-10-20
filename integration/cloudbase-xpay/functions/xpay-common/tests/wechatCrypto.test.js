/**
 * 消息推送验签 / 解密测试
 *
 * 背景：集成中心未上线时，URL 校验与安全模式解密由云函数自己完成。
 * 这里的 encrypt 是测试用的「按微信规范加密」实现（random + len + msg + appId），
 * 用来验证 decrypt 的结构解析是否正确（round-trip + 结构断言）。
 */

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const {
    sha1Signature,
    verifySignature,
    decrypt,
    extractEncrypt,
    handleUrlVerify,
} = require('../utils/wechatCrypto');

const AES_KEY_BASE64 = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'; // 43 位
const APP_ID = 'wx_test_appid';

/** 按微信规范加密（仅测试用） */
function encrypt(msg, aesKeyBase64, appId) {
    const key = Buffer.from(aesKeyBase64 + '=', 'base64');
    const iv = key.subarray(0, 16);

    const random = crypto.randomBytes(16);
    const msgBuf = Buffer.from(msg, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(msgBuf.length, 0);
    const appBuf = Buffer.from(appId || '', 'utf8');

    let buf = Buffer.concat([random, lenBuf, msgBuf, appBuf]);

    const padLen = 32 - (buf.length % 32) || 32;
    buf = Buffer.concat([buf, Buffer.alloc(padLen, padLen)]);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(buf), cipher.final()]).toString('base64');
}

test('sha1Signature：按字典序拼接后 SHA1，顺序无关', () => {
    const a = sha1Signature(['token', '123', 'nonce']);
    const b = sha1Signature(['nonce', 'token', '123']);
    assert.strictEqual(a, b);
    assert.match(a, /^[0-9a-f]{40}$/);
});

test('verifySignature：正确签名通过、篡改失败', () => {
    const payload = { token: 'test', timestamp: '1700000000', nonce: 'abc' };
    const sig = sha1Signature([payload.token, payload.timestamp, payload.nonce]);

    assert.strictEqual(verifySignature({ ...payload, signature: sig }), true);
    assert.strictEqual(verifySignature({ ...payload, signature: 'deadbeef' }), false);
    // 安全模式下 encrypt 参与签名
    assert.strictEqual(verifySignature({ ...payload, signature: sig, encrypt: 'xxx' }), false);
});

test('decrypt：能还原明文并校验 appId', () => {
    const msg = '<xml><Event><![CDATA[xpay_goods_deliver_notify]]></Event></xml>';
    const encrypted = encrypt(msg, AES_KEY_BASE64, APP_ID);

    assert.strictEqual(decrypt(encrypted, AES_KEY_BASE64, APP_ID), msg);
});

test('decrypt：appId 不匹配时抛错', () => {
    const encrypted = encrypt('<xml/>', AES_KEY_BASE64, 'wx_other_appid');
    assert.throws(() => decrypt(encrypted, AES_KEY_BASE64, APP_ID), /appId 不匹配/);
});

test('decrypt：EncodingAESKey 长度非法时抛错', () => {
    assert.throws(() => decrypt('AAAA', 'tooshort', APP_ID), /msgSecret 长度非法/);
});

test('extractEncrypt：兼容 CDATA 与普通两种写法', () => {
    assert.strictEqual(extractEncrypt('<xml><Encrypt><![CDATA[abc123]]></Encrypt></xml>'), 'abc123');
    assert.strictEqual(extractEncrypt('<xml><Encrypt>abc123</Encrypt></xml>'), 'abc123');
    assert.strictEqual(extractEncrypt('<xml><Event>x</Event></xml>'), null);
});

test('handleUrlVerify：明文模式原样回 echostr', () => {
    const timestamp = '1700000000';
    const nonce = 'n1';
    const signature = sha1Signature(['test', timestamp, nonce]);

    const r = handleUrlVerify({
        token: 'test',
        encodingAESKey: AES_KEY_BASE64,
        query: { signature, timestamp, nonce, echostr: 'echo-plain' },
    });

    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.echo, 'echo-plain');
});

test('handleUrlVerify：安全模式解密 echostr 后返回', () => {
    const timestamp = '1700000000';
    const nonce = 'n1';
    const signature = sha1Signature(['test', timestamp, nonce]);
    const encryptedEcho = encrypt('echo-aes', AES_KEY_BASE64, APP_ID);

    const r = handleUrlVerify({
        token: 'test',
        encodingAESKey: AES_KEY_BASE64,
        query: {
            signature, timestamp, nonce, echostr: encryptedEcho, encrypt_type: 'aes',
        },
    });

    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.echo, 'echo-aes');
});

test('handleUrlVerify：签名错误时拒绝（Token 配错的最常见表现）', () => {
    const r = handleUrlVerify({
        token: 'test',
        encodingAESKey: AES_KEY_BASE64,
        query: {
            signature: 'badsignature', timestamp: '1', nonce: 'n', echostr: 'x',
        },
    });

    assert.strictEqual(r.ok, false);
    assert.match(r.reason, /signature 校验失败/);
});

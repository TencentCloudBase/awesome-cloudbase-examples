/**
 * 自建回调端到端测试：URL 校验 / 明文验签 / 安全模式验签解密
 *
 * 覆盖的关键点（都是会静默丢单或可被伪造的地方）：
 *   1. 明文 POST 必须验 signature —— 不验则任何人可伪造 deliver 事件触发发货
 *   2. 无签名参数的 XML 推送必须拒绝（token 已配置时）
 *   3. 安全模式的 msg_signature 签名串必须包含 Encrypt
 *   4. JSON 形态的密文（{Encrypt:...}）也要能解密，否则回 200 但不发货
 *   5. 未配置 token 时（网关代验签）无签名推送要放行，不能误拦
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

const TOKEN = 'test_callback_token';
const AES_KEY_BASE64 = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'; // 43 位
const APP_ID = 'wx_test_appid';

process.env.offerId = 'test_offer_123';
process.env.appKey = 'test_app_key_abcdef';
process.env.appId = APP_ID;
process.env.secret = 'test_secret';
process.env.token = TOKEN;
process.env.msgSecret = AES_KEY_BASE64;
// 安全意义：模板默认不开这个，避免让端到端测试依赖额外的鉴权头
process.env.requireCallerAuth = '';

const { sha1Signature } = require('../utils/wechatCrypto');
const app = require('../app');

let server;
let base;

before(async () => {
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => { server.close(resolve); }));

/** 按微信规范加密：random(16) + msgLen(4,BE) + msg + appId，PKCS#7 补位到 32 */
function encryptMsg(msg, aesKeyBase64, appId) {
    const key = Buffer.from(aesKeyBase64 + '=', 'base64');
    const iv = key.subarray(0, 16);
    const msgBuf = Buffer.from(msg, 'utf8');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(msgBuf.length, 0);

    let buf = Buffer.concat([
        crypto.randomBytes(16), lenBuf, msgBuf, Buffer.from(appId, 'utf8'),
    ]);
    const pad = 32 - (buf.length % 32);
    buf = Buffer.concat([buf, Buffer.alloc(pad, pad)]);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    cipher.setAutoPadding(false);
    return Buffer.concat([cipher.update(buf), cipher.final()]).toString('base64');
}

function ts() {
    return String(Math.floor(Date.now() / 1000));
}

function deliverXml(outTradeNo) {
    return '<xml>'
        + '<ToUserName><![CDATA[gh_test]]></ToUserName>'
        + '<FromUserName><![CDATA[o_official]]></FromUserName>'
        + '<CreateTime>1760000000</CreateTime>'
        + '<MsgType><![CDATA[event]]></MsgType>'
        + '<Event><![CDATA[xpay_goods_deliver_notify]]></Event>'
        + '<OpenId><![CDATA[o_user_001]]></OpenId>'
        + `<OutTradeNo><![CDATA[${outTradeNo}]]></OutTradeNo>`
        + '<Env>0</Env>'
        + '</xml>';
}

function encryptXml(encrypt) {
    return '<xml>'
        + '<ToUserName><![CDATA[gh_test]]></ToUserName>'
        + `<Encrypt><![CDATA[${encrypt}]]></Encrypt>`
        + '</xml>';
}

function postPlain(xml, query = '') {
    return fetch(`${base}/xpay/callback${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
    });
}

// ---------- URL 校验（GET echostr） ----------

test('URL 校验：签名正确时原样回显 echostr', async () => {
    const t = ts();
    const nonce = 'n_url_ok';
    const sig = sha1Signature([TOKEN, t, nonce]);
    const r = await fetch(`${base}/xpay-demo?signature=${sig}&timestamp=${t}&nonce=${nonce}&echostr=echo123`);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(await r.text(), 'echo123');
});

test('URL 校验：签名错误返回 401（Token 与后台不一致）', async () => {
    const t = ts();
    const r = await fetch(`${base}/xpay-demo?signature=deadbeef&timestamp=${t}&nonce=n1&echostr=echo123`);
    assert.strictEqual(r.status, 401);
});

// ---------- 明文模式 ----------

test('明文推送：签名正确时放行', async () => {
    const t = ts();
    const nonce = 'n_plain_ok';
    const sig = sha1Signature([TOKEN, t, nonce]);
    const r = await postPlain(deliverXml('PLAIN20261019001'), `?signature=${sig}&timestamp=${t}&nonce=${nonce}`);
    assert.strictEqual(r.status, 200);
});

test('⚠️ 明文推送：签名错误时拒绝', async () => {
    const t = ts();
    const r = await postPlain(deliverXml('PLAIN20261019002'), `?signature=bad&timestamp=${t}&nonce=n2`);
    assert.strictEqual(r.status, 401);
});

test('🔒 明文推送：完全没有签名参数时必须拒绝（否则可伪造发货）', async () => {
    const r = await postPlain(deliverXml('FORGED20261019001'));
    assert.strictEqual(r.status, 401, '带 token 配置时，无签名的 XML 推送应被拒绝');
});

// ---------- 安全模式 ----------

test('安全模式：XML 密文验签+解密后进入业务路由', async () => {
    const t = ts();
    const nonce = 'n_aes_ok';
    const encrypt = encryptMsg(deliverXml('AES20261019001'), AES_KEY_BASE64, APP_ID);
    const msgSig = sha1Signature([TOKEN, t, nonce, encrypt]);

    const r = await postPlain(
        encryptXml(encrypt),
        `?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`
    );
    assert.strictEqual(r.status, 200);
});

test('安全模式：msg_signature 错误时拒绝', async () => {
    const t = ts();
    const nonce = 'n_aes_bad';
    const encrypt = encryptMsg(deliverXml('AES20261019002'), AES_KEY_BASE64, APP_ID);

    const r = await postPlain(
        encryptXml(encrypt),
        `?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=bad&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`
    );
    assert.strictEqual(r.status, 401);
});

test('⚠️ 安全模式：JSON 形态密文（{Encrypt:...}）也要能解密', async () => {
    const t = ts();
    const nonce = 'n_json_aes';
    const encrypt = encryptMsg(deliverXml('JSON20261019001'), AES_KEY_BASE64, APP_ID);
    const msgSig = sha1Signature([TOKEN, t, nonce, encrypt]);

    const r = await fetch(
        `${base}/xpay/callback?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ToUserName: 'gh_test', Encrypt: encrypt }),
        }
    );
    assert.strictEqual(r.status, 200, 'JSON 密文不应被当作明文跳过');
});

test('⚠️ 安全模式 + JSON 数据格式：解密后是 JSON 明文，不能当 XML 解析', async () => {
    const t = ts();
    const nonce = 'n_json_plain';
    // 后台「数据格式」选 JSON 时，解密出来的明文就是 JSON 字符串
    const plain = JSON.stringify({
        ToUserName: 'gh_test',
        FromUserName: 'o_official',
        CreateTime: '1760000000',
        MsgType: 'event',
        Event: 'xpay_goods_deliver_notify',
        OpenId: 'o_user_001',
        OutTradeNo: 'JSONPLAIN20261019001',
        Env: 0,
    });
    const encrypt = encryptMsg(plain, AES_KEY_BASE64, APP_ID);
    const msgSig = sha1Signature([TOKEN, t, nonce, encrypt]);

    const r = await fetch(
        `${base}/xpay/callback?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ToUserName: 'gh_test', Encrypt: encrypt }),
        }
    );
    assert.strictEqual(r.status, 200, 'JSON 明文被当 XML 解析 → 空对象 → 取不到 Event → 404');
});

test('⚠️ 推送打到根路径 / 时也要能路由（访问服务可能剥掉前缀）', async () => {
    const t = ts();
    const nonce = 'n_root_path';
    const plain = JSON.stringify({
        ToUserName: 'gh_test',
        MsgType: 'event',
        Event: 'xpay_goods_deliver_notify',
        OpenId: 'o_user_001',
        OutTradeNo: 'ROOTPATH20261019001',
        Env: 0,
    });
    const encrypt = encryptMsg(plain, AES_KEY_BASE64, APP_ID);
    const msgSig = sha1Signature([TOKEN, t, nonce, encrypt]);

    const r = await fetch(
        `${base}/?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ToUserName: 'gh_test', Encrypt: encrypt }),
        }
    );
    assert.strictEqual(r.status, 200, '根路径必须靠 Event 字段反查路由，不能 404');
});

test('安全模式：密文被篡改时解密失败返回 400', async () => {
    const t = ts();
    const nonce = 'n_aes_broken';
    // 签名对得上、但密文本身是坏的：验签过、解密必须炸
    const broken = Buffer.alloc(64, 1).toString('base64');
    const msgSig = sha1Signature([TOKEN, t, nonce, broken]);

    const r = await postPlain(
        encryptXml(broken),
        `?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`
    );
    assert.strictEqual(r.status, 400);
});

// ---------- 网关代验签（未配置 token） ----------

// 🚨 fail closed：类型未声明时不能靠「token 没配」猜成网关代验签。
//    漏配 token 是常见误操作，猜错的代价是任何人都能伪造发货推送。
test('未声明类型且未配 token：无签名推送按「需验签」拒绝', async () => {
    const savedToken = process.env.token;
    const savedType = process.env.notifyUrlCallbackType;
    delete process.env.token;
    delete process.env.notifyUrlCallbackType;

    try {
        const r = await postPlain(deliverXml('GATEWAY20261019001'));
        assert.strictEqual(r.status, 401, '未声明就按自己验签处理，缺签名必须拒绝');
    } finally {
        process.env.token = savedToken;
        if (savedType === undefined) delete process.env.notifyUrlCallbackType;
        else process.env.notifyUrlCallbackType = savedType;
    }
});

// 同一份报文，只要在平台上声明 system，就应当放行（网关已代验签）
test('声明 system 且未配 token：无签名推送放行', async () => {
    const savedToken = process.env.token;
    const savedType = process.env.notifyUrlCallbackType;
    delete process.env.token;
    process.env.notifyUrlCallbackType = 'system';

    try {
        const r = await postPlain(deliverXml('GATEWAY20261019002'));
        assert.strictEqual(r.status, 200, 'system = 网关代验签，不应误拦');
    } finally {
        process.env.token = savedToken;
        if (savedType === undefined) delete process.env.notifyUrlCallbackType;
        else process.env.notifyUrlCallbackType = savedType;
    }
});

// 鉴权绕过的核心用例：旧实现只在 body 是 XML 时拦截无签名推送，
// 把 Content-Type 换成 application/json 就能零成本伪造发货事件
test('无签名 + JSON body：伪造发货事件必须 401', async () => {
    const r = await fetch(`${base}/xpay/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Event: 'xpay_goods_deliver_notify',
            OutTradeNo: 'FORGED20261019001',
            OpenId: 'o_attacker',
        }),
    });

    assert.strictEqual(r.status, 401, 'JSON 形态不能绕过验签');
});

// ---------- 平台声明字段（notifyUrlCallbackType / msgEncryptType） ----------

test('声明 system：即使误配了 token，也不拦网关转发的无签名明文', async () => {
    const saved = process.env.notifyUrlCallbackType;
    process.env.notifyUrlCallbackType = 'system';

    try {
        const r = await postPlain(deliverXml('SYSTEM20261019001'));
        assert.strictEqual(r.status, 200, 'system 声明应优先于 token 启发式');
    } finally {
        if (saved === undefined) delete process.env.notifyUrlCallbackType;
        else process.env.notifyUrlCallbackType = saved;
    }
});

test('声明 ownservice 但未配 token：带签名的推送必须拒绝', async () => {
    const savedType = process.env.notifyUrlCallbackType;
    const savedToken = process.env.token;
    process.env.notifyUrlCallbackType = 'ownservice';
    delete process.env.token;

    try {
        const t = ts();
        const nonce = 'n_own_no_token';
        const sig = sha1Signature([TOKEN, t, nonce]); // 用真实 Token 算，但函数没配 token
        const r = await postPlain(deliverXml('OWN20261019001'), `?signature=${sig}&timestamp=${t}&nonce=${nonce}`);
        assert.strictEqual(r.status, 401, '声明优先：ownservice 不会因缺 token 就放弃验签');
    } finally {
        process.env.token = savedToken;
        if (savedType === undefined) delete process.env.notifyUrlCallbackType;
        else process.env.notifyUrlCallbackType = savedType;
    }
});

test('⚠️ 兼容模式：解密失败时回退明文字段，不丢单', async () => {
    const saved = process.env.msgEncryptType;
    process.env.msgEncryptType = 'compatible';

    try {
        const t = ts();
        const nonce = 'n_compat';
        const broken = Buffer.alloc(64, 1).toString('base64');
        const msgSig = sha1Signature([TOKEN, t, nonce, broken]);

        // 兼容模式：微信同时下发明文字段与 Encrypt
        const xml = '<xml>'
            + '<ToUserName><![CDATA[gh_test]]></ToUserName>'
            + '<MsgType><![CDATA[event]]></MsgType>'
            + '<Event><![CDATA[xpay_goods_deliver_notify]]></Event>'
            + '<OutTradeNo><![CDATA[COMPAT20261019001]]></OutTradeNo>'
            + `<Encrypt><![CDATA[${broken}]]></Encrypt>`
            + '</xml>';

        const r = await postPlain(
            xml,
            `?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`
        );
        assert.strictEqual(r.status, 200, '兼容模式下明文字段可用，不应 400');
    } finally {
        if (saved === undefined) delete process.env.msgEncryptType;
        else process.env.msgEncryptType = saved;
    }
});

test('兼容模式：没有明文字段时，解密失败仍返回 400', async () => {
    const saved = process.env.msgEncryptType;
    process.env.msgEncryptType = 'compatible';

    try {
        const t = ts();
        const nonce = 'n_compat_broken';
        const broken = Buffer.alloc(64, 1).toString('base64');
        const msgSig = sha1Signature([TOKEN, t, nonce, broken]);

        const r = await postPlain(
            encryptXml(broken),
            `?signature=${sha1Signature([TOKEN, t, nonce])}&msg_signature=${msgSig}&timestamp=${t}&nonce=${nonce}&encrypt_type=aes`
        );
        assert.strictEqual(r.status, 400, '无明文可回退时必须失败，让微信重推');
    } finally {
        if (saved === undefined) delete process.env.msgEncryptType;
        else process.env.msgEncryptType = saved;
    }
});

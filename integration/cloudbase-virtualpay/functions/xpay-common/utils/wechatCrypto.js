/**
 * 微信消息推送：URL 校验 + 安全模式解密
 *
 * 适用场景：**没有集成中心网关代验签**（集成中心未上线 / 直连云函数 HTTP 网关）时，
 * 验签与解密必须由云函数自己完成，否则：
 *   - 后台保存回调 URL 时校验不过（GET echostr）
 *   - 安全模式下收到的是密文 <Encrypt>，解析不出 Event
 *
 * 明文模式：只需 URL 校验，不需要解密（本文件 decrypt 不会被调用）
 * 安全模式：URL 校验要解密 echostr；每条推送要验 msg_signature + AES-256-CBC 解密
 *
 * 依赖的密钥：token（消息推送 Token）、msgSecret（EncodingAESKey，43 位）
 */

const crypto = require('crypto');

const AES_KEY_LEN = 32;

/**
 * 把 EncodingAESKey（43 位 Base64）还原为 32 字节 AES Key
 * @param {string} encodingAESKey
 * @returns {Buffer}
 */
function decodeAesKey(encodingAESKey) {
    if (!encodingAESKey) throw new Error('缺少 msgSecret（EncodingAESKey）');
    const key = Buffer.from(String(encodingAESKey) + '=', 'base64');
    if (key.length !== AES_KEY_LEN) {
        throw new Error(`msgSecret 长度非法：解出 ${key.length} 字节，应为 ${AES_KEY_LEN}`);
    }
    return key;
}

/**
 * 微信签名：token / timestamp / nonce /（可选 encrypt）字典序拼接后 SHA1
 *
 * ⚠️ 不能把空串从签名串里过滤掉：
 *    token 未配置时若静默剔除，签名串退化成空串，
 *    签名值恒为 sha1('') = da39a3ee...，任何人都能拿这个公开常量通过验签。
 *    必填项为空串时这里原样参与拼接（结果必然对不上），由 verifySignature 提前拒绝。
 * @param {string[]} parts
 * @returns {string} hex
 */
function sha1Signature(parts) {
    return crypto
        .createHash('sha1')
        // 只有 undefined / null 表示「该参数不参与」（如明文模式没有 encrypt）
        .update(parts.filter(v => v !== undefined && v !== null).map(String).sort().join(''))
        .digest('hex');
}

/**
 * 定时安全比较（避免签名比较被时序攻击探测）
 */
function safeEqual(a, b) {
    const ba = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}

/**
 * 验签
 * @param {Object} p
 * @param {string} p.token - 消息推送 Token
 * @param {string} p.timestamp
 * @param {string} p.nonce
 * @param {string} [p.encrypt] - 安全模式下参与签名
 * @param {string} p.signature - 传入的 signature / msg_signature
 * @returns {boolean}
 */
function verifySignature({ token, timestamp, nonce, encrypt, signature }) {
    // 🚨 缺 token 时必须直接拒绝，不能拿空串去算：
    //    空串会让签名串退化，算出来的常量对谁都成立
    if (!token) {
        console.error('[Crypto] 未配置 token，拒绝验签'
            + '（若回调已由集成中心网关代验签，请声明 notifyURLCallbackType=system；'
            + '此时 token 由平台注入也不会被本函数使用）');
        return false;
    }
    if (!signature) return false;

    const expected = sha1Signature([token, timestamp, nonce, encrypt]);
    return safeEqual(expected, signature);
}

/**
 * AES-256-CBC 解密
 *
 * 明文结构：random(16) + msgLen(4, 大端) + msg + appId
 * @param {string} encrypted - Base64 密文
 * @param {string} encodingAESKey - 43 位
 * @param {string} appId - 小程序 AppID，**必填**：校验密文尾部 appId 绑定
 * @returns {string} 明文
 */
function decrypt(encrypted, encodingAESKey, appId) {
    const key = decodeAesKey(encodingAESKey);
    const iv = key.subarray(0, 16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false);

    let buf = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'base64')),
        decipher.final(),
    ]);

    // 去 PKCS7 填充
    const pad = buf[buf.length - 1];
    if (pad < 1 || pad > 32) throw new Error('解密失败：PKCS7 填充非法');
    buf = buf.subarray(0, buf.length - pad);

    if (buf.length < 20) throw new Error('解密失败：明文过短');

    const msgLen = buf.readUInt32BE(16);
    if (20 + msgLen > buf.length) throw new Error('解密失败：msgLen 越界');

    const msg = buf.subarray(20, 20 + msgLen).toString('utf8');
    const fromAppId = buf.subarray(20 + msgLen).toString('utf8');

    // 🚨 空串不能当「跳过校验」的哨兵：
    //    调用方拿不到 appId 时会传空串（app.js 取 xpayConfig.appId || ''），
    //    旧写法 `if (appId && ...)` 直接短路 → 跨 appId 的密文被当成合法推送。
    //    所以拆成两条独立判断：没给 appId = 配置缺失，直接失败；给了就必须逐字相等。
    if (!appId) {
        throw new Error('解密失败：未配置 appId，无法完成 appId 绑定校验');
    }
    // 密文尾部按微信规范必须带 appId；解出来为空同样是不匹配（不能白名单放行）
    if (fromAppId !== appId) {
        throw new Error(`解密失败：appId 不匹配（密文 ${fromAppId || '(空)'} / 期望 ${appId}）`);
    }

    return msg;
}

/**
 * 从推送体里取 Encrypt 字段
 *
 * 安全模式的推送有三种落地形态，都要认：
 *   ① XML 字符串：<Encrypt><![CDATA[...]]></Encrypt>（默认格式）
 *   ② JSON 对象：{ "Encrypt": "..." }（后台开了 JSON 格式，且被 express.json 解析成对象）
 *   ③ JSON 字符串：'{"Encrypt":"..."}'（Content-Type 非 application/json，走了 text 解析）
 * 只认 ① 会让 ②③ 被当成明文跳过 → 解析不出 Event → 回 200 但不发货（静默丢单）。
 *
 * @param {string|Object} payload
 * @returns {string|null}
 */
function extractEncrypt(payload) {
    if (payload && typeof payload === 'object') {
        const v = payload.Encrypt || payload.encrypt;
        return typeof v === 'string' && v ? v : null;
    }

    if (typeof payload !== 'string') return null;

    const trimmed = payload.trim();

    // ③ JSON 字符串
    if (trimmed.startsWith('{')) {
        try {
            const obj = JSON.parse(trimmed);
            const v = obj && (obj.Encrypt || obj.encrypt);
            if (typeof v === 'string' && v) return v;
        } catch (_) {
            // 不是 JSON，继续按 XML 找
        }
    }

    const cdata = /<Encrypt>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/Encrypt>/.exec(payload);
    if (cdata) return cdata[1];
    const plain = /<Encrypt>\s*([\s\S]*?)\s*<\/Encrypt>/.exec(payload);
    return plain ? plain[1] : null;
}

/**
 * 处理微信消息推送的 URL 校验（GET + echostr）
 *
 * @param {Object} p
 * @param {string} p.token
 * @param {string} p.encodingAESKey
 * @param {Object} p.query - req.query（signature/timestamp/nonce/echostr/encrypt_type）
 * @param {string} [p.appId] - 小程序 AppID，用于校验 echostr 密文尾部的 appId 绑定
 * @returns {{ok: boolean, echo?: string, reason?: string}}
 */
function handleUrlVerify({ token, encodingAESKey, query = {}, appId }) {
    const { signature, timestamp, nonce, echostr, encrypt_type: encryptType } = query;

    if (!signature || !timestamp || !nonce || !echostr) {
        return { ok: false, reason: '缺少 signature/timestamp/nonce/echostr' };
    }

    // URL 校验的 signature 不包含 encrypt
    if (!verifySignature({ token, timestamp, nonce, signature })) {
        return { ok: false, reason: 'signature 校验失败（Token 与后台是否一致？）' };
    }

    // 安全模式下 echostr 是密文，必须解密后把明文回给微信。
    //
    // ⚠️ 不能只认 query 里的 encrypt_type=aes：
    //    该参数主要出现在 POST 推送里，微信校验回调 URL 的 GET 请求**不保证**带它。
    //    此时 echostr 明明是密文，却被原样返回 → 微信判定回调地址不可用。
    //    判定依据改为「显式 aes，或已配置 43 位 EncodingAESKey（说明开了安全模式）」，
    //    不靠字符集去猜是不是密文 —— 猜错就会把密文当明文回给微信。
    const maybeAes = encryptType === 'aes'
        || (typeof encodingAESKey === 'string' && encodingAESKey.length === 43);

    if (maybeAes) {
        try {
            // appId 一并传入：echostr 密文尾部同样带 appId，不校验就等于放弃绑定检查
            return { ok: true, echo: decrypt(echostr, encodingAESKey, appId) };
        } catch (err) {
            // 显式声明 aes 却解不开 = 密钥不匹配，必须暴露，不能静默回退
            if (encryptType === 'aes') {
                return { ok: false, reason: `echostr 解密失败：${err.message}` };
            }
            // 未显式声明：可能配了 AESKey 但后台是明文模式，按明文返回
            console.warn('[Crypto] echostr 解密失败，按明文返回:', err.message);
        }
    }

    return { ok: true, echo: echostr };
}

module.exports = {
    sha1Signature,
    verifySignature,
    decrypt,
    extractEncrypt,
    handleUrlVerify,
};

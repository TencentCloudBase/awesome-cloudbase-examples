/**
 * CloudBase Auth 工具
 *
 * 虚拟支付是小程序场景，与 Stripe 模板不同：这里「需要」openid。
 * - 小程序经 wx.cloud.callHTTPFunction 调用时，平台注入 x-wx-openid / x-wx-appid
 * - 服务端经 Bearer accessToken 调用时，从 JWT 解析
 *
 * 🚨 信任边界（重要）
 * 本模块**不做** JWT 签名校验 —— 校验需要 CloudBase 公钥，属于上游的职责。
 * 因此必须区分两类身份的信任级别：
 *
 *   x-wx-openid   ← 平台网关注入（并覆盖客户端同名头）时可信
 *   Bearer JWT    ← payload 仅 base64 编码，**任何人可伪造**，默认不采信
 *
 * ⚠️ 但「平台网关注入」这个前提**只在请求确实过网关时成立**。
 *    云函数一旦被公网直连（HTTP 访问服务 / 云托管自定义域名），
 *    客户端可以自己塞一行 `x-wx-openid: <别人的 openid>` —— 头本身没有任何签名。
 *    所以：
 *      · 宽松模式（默认）：采信该头，适合「只经 callHTTPFunction 调用」的场景
 *      · 收紧模式 requireCallerAuth=true：**不再采信裸头**，
 *        除非显式声明 trustPlatformHeaders=true（确认部署层已剥离客户端同名头）
 *
 * 采信的头值还必须过格式白名单，避免把任意字符串当身份往下传。
 */

/** 平台注入的 openid 形如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX（28 位上下），放宽到 10–64 位安全字符 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * 是否采信未验签的 JWT payload
 * 默认 false：宁可不识别身份，也不接受可伪造的身份
 */
function trustUnverifiedJwt() {
    return process.env.trustUnverifiedJwt === 'true';
}

/** 是否处于收紧模式（要求调用方身份） */
function isStrictAuth() {
    return process.env.requireCallerAuth === 'true';
}

/**
 * 是否采信平台注入头
 *
 * 收紧模式下默认不采信（该头客户端可伪造）；
 * 只有在部署层能保证「客户端同名头被网关覆盖」时，才显式声明 trustPlatformHeaders=true。
 */
function trustPlatformHeaders() {
    if (!isStrictAuth()) return true;
    return process.env.trustPlatformHeaders === 'true';
}

/**
 * 校验并取平台注入的 openid
 * @param {Object} req
 * @returns {string|null}
 */
function getPlatformOpenId(req) {
    const raw = req.headers['x-wx-openid'];
    if (typeof raw !== 'string') return null;

    const value = raw.trim();
    if (!value) return null;

    if (!OPENID_RE.test(value)) {
        console.warn('[Auth] x-wx-openid 格式非法，已忽略（长度 10-64，仅字母数字-_）');
        return null;
    }

    if (!trustPlatformHeaders()) {
        console.warn('[Auth] 收紧模式下不采信 x-wx-openid 头（客户端可伪造）。'
            + '确认部署层已覆盖该头后可设 trustPlatformHeaders=true');
        return null;
    }

    return value;
}

/**
 * 解析 Bearer JWT 的 payload
 *
 * ⚠️ 返回的是**未验签**的内容，调用方必须清楚这一点。
 * 未开启 trustUnverifiedJwt 时直接返回 null（拒绝采信）。
 *
 * @param {Object} req
 * @returns {Object|null}
 */
function parseCloudBaseAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    if (!trustUnverifiedJwt()) {
        console.warn(
            '[Auth] 收到 Bearer token，但未开启 trustUnverifiedJwt，不采信其 payload。'
            + '若请求必经上游网关验签，可设置 trustUnverifiedJwt=true。'
        );
        return null;
    }

    try {
        const token = authHeader.slice('Bearer '.length);
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

        // ⚠️ JSON.parse 可以返回任意 JSON 值（数字/数组/字符串/null）。
        //    不校验类型的话，`Bearer a.MTIz.c` 解析出 123 也算「有身份」，
        //    payMiddleware 里的 if (authInfo) 直接把请求放行 —— 等于空 token 过鉴权。
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            console.warn('[Auth] JWT payload 不是对象，拒绝采信');
            return null;
        }

        return payload;
    } catch (err) {
        console.warn('[Auth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 从对象里取第一个合法的 openid 字段
 * JWT 与平台头必须走同一套格式白名单，避免其中一条成为校验盲区
 * @param {Object} payload
 * @returns {string|null}
 */
function pickOpenIdFromPayload(payload) {
    const candidates = [payload.sub, payload.openid, payload.openId, payload.uid];
    for (const value of candidates) {
        if (typeof value === 'string' && OPENID_RE.test(value)) return value;
    }
    return null;
}

/**
 * 获取用户 openid
 * 优先取平台注入的 x-wx-openid（受信任级别约束），回退到 JWT（需显式开启信任）
 * @param {Object} req
 * @returns {string|null}
 */
function getOpenId(req) {
    const platformOpenId = getPlatformOpenId(req);
    if (platformOpenId) return platformOpenId;

    const authInfo = parseCloudBaseAuth(req);
    if (!authInfo) return null;

    // 与平台头同等强度校验：不合格式就当作没有身份，不能把任意字符串传进业务链路
    return pickOpenIdFromPayload(authInfo);
}

/** 获取小程序 appid（平台注入；同样受信任级别约束） */
function getAppId(req) {
    const raw = req.headers['x-wx-appid'];
    if (typeof raw !== 'string') return null;

    const value = raw.trim();
    // 小程序 appid 固定为 wx + 16 位十六进制，放宽到大小写兼容
    if (!/^wx[0-9a-zA-Z]{16}$/.test(value)) return null;

    return trustPlatformHeaders() ? value : null;
}

module.exports = {
    parseCloudBaseAuth,
    getOpenId,
    getAppId,
    getPlatformOpenId,
    trustUnverifiedJwt,
    trustPlatformHeaders,
    isStrictAuth,
};

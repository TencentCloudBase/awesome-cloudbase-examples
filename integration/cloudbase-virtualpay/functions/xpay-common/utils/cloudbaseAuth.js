/**
 * CloudBase Auth 工具
 *
 * 虚拟支付是小程序场景，身份默认只有一个来源：平台网关注入的请求头
 * （`wx.cloud.callHTTPFunction` 会注入 `x-wx-openid` / `x-wx-appid`）。
 *
 * 🚨 信任边界（务必理解后再上线）
 * 这两个头**没有任何签名**，只有「请求确实经过平台网关」时才可信。
 * 云函数一旦被公网直连（HTTP 访问服务 / 云托管自定义域名），
 * 客户端可以自己塞一行 `x-wx-openid: <别人的 openid>` 冒充身份。
 *
 * 🚨 关于 Bearer JWT（服务端 / 第三方调用）
 * JWT payload 只是 base64 编码，**任何人可伪造**；验签需要 CloudBase 公钥，
 * 属于上游（云 API 网关）职责。因此这里**默认不采信** Bearer 身份。
 *
 * 需要支持「服务端带 access_token 调用」时，显式开启：
 *
 *     trustBearerIdentity=true      # 见 cloudbaserc.json 的 functions[].envVariables
 *
 * 开启的前提必须是：**该环境的云函数只经云 API 网关暴露**（网关已验证 token 签名）。
 * 若函数同时能被公网直连，这个开关会让伪造 Bearer 的攻击者冒充任意用户。
 *
 * 采信的头值还必须过格式白名单，避免把任意字符串当身份往下传。
 */

/** openid 形如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX（28 位上下），放宽到 10–64 位安全字符 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * 是否采信 Bearer JWT 中的身份
 * 每次调用都读，改环境变量后无需冷启动即可生效
 * @returns {boolean}
 */
function isTrustBearerIdentity() {
    const value = (process.env.trustBearerIdentity || '').trim().toLowerCase();
    return value === 'true' || value === '1';
}

/**
 * 归一化并校验 openid 格式
 * @param {*} value
 * @returns {string|null}
 */
function normalizeOpenId(value) {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    if (!OPENID_RE.test(trimmed)) {
        console.warn('[Auth] openid 格式非法，已忽略（长度 10-64，仅字母数字-_）');
        return null;
    }

    return trimmed;
}

/**
 * 校验并取平台注入的 openid
 * @param {Object} req
 * @returns {string|null}
 */
function getPlatformOpenId(req) {
    return normalizeOpenId(req.headers['x-wx-openid']);
}

/**
 * 解码 Authorization header 里的 JWT payload
 *
 * ⚠️ 只解码、不验签 —— 验签是云 API 网关的职责，函数内没有公钥。
 *    因此返回值只有在「请求必经网关」且显式开启 trustBearerIdentity 时才可用。
 *
 * @param {Object} req
 * @returns {Object|null}
 */
function parseCloudBaseAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    try {
        const token = authHeader.slice('Bearer '.length).trim();
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf8')
        );

        return payload && typeof payload === 'object' ? payload : null;
    } catch (err) {
        console.warn('[Auth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 获取用户 openid
 *
 * 优先级：
 *   1. 平台注入的 `x-wx-openid`（callHTTPFunction / callContainer）
 *   2. Bearer JWT 的 `provider_sub` —— **仅当 trustBearerIdentity=true**
 *      （sub 是 CloudBase UID，provider_sub 才是微信 openid）
 *
 * @param {Object} req
 * @returns {string|null}
 */
function getOpenId(req) {
    const platformOpenId = getPlatformOpenId(req);
    if (platformOpenId) return platformOpenId;

    if (!isTrustBearerIdentity()) return null;

    const payload = parseCloudBaseAuth(req);
    return normalizeOpenId(payload?.provider_sub);
}

/** 获取小程序 appid（平台注入） */
function getAppId(req) {
    const raw = req.headers['x-wx-appid'];
    if (typeof raw !== 'string') return null;

    const value = raw.trim();
    // 小程序 appid 固定为 wx + 16 位十六进制，放宽到大小写兼容
    if (!/^wx[0-9a-zA-Z]{16}$/.test(value)) return null;

    return value;
}

module.exports = {
    getOpenId,
    getAppId,
    getPlatformOpenId,
    parseCloudBaseAuth,
    isTrustBearerIdentity,
    normalizeOpenId,
};

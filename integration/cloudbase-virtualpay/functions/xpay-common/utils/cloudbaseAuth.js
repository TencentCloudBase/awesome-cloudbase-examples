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
 * 🚨 关于 `Authorization: Bearer`：**不采信**
 * JWT payload 只是 base64 编码，任何人可伪造；验证签名需要 CloudBase 公钥，
 * 属于上游（云 API 网关）职责。虚拟支付只在小程序内发起（`callHTTPFunction`），
 * 平台一定会注入 `x-wx-openid`，因此**没有任何需要读 Bearer 的合法场景**。
 *
 * 历史的 `trustBearerIdentity` 开关已删除：它默认关闭，但一旦打开就等于
 * 允许任何人拼一个 `{"provider_sub":"别人的 openid"}` 的假 JWT 冒充用户。
 * 若将来确实要支持服务端带 access_token 调用，正确做法是在函数内验证 JWT 签名
 * （拉 CloudBase Auth 公钥），而不是重新引入一个「假定网关已验签」的开关。
 *
 * 采信的头值还必须过格式白名单，避免把任意字符串当身份往下传。
 */

/** openid 形如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX（28 位上下），放宽到 10–64 位安全字符 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

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
 * 获取用户 openid
 *
 * 唯一来源：平台注入的 `x-wx-openid`（`wx.cloud.callHTTPFunction` / `callContainer`）。
 * 取不到就是取不到 —— 不回退到任何客户端可控的值（header 白名单之外的、body、JWT）。
 *
 * @param {Object} req
 * @returns {string|null}
 */
function getOpenId(req) {
    return getPlatformOpenId(req);
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
    normalizeOpenId,
};

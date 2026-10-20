/**
 * CloudBase Auth 工具
 *
 * 虚拟支付是小程序场景，身份只有一个来源：平台网关注入的请求头。
 * - 小程序经 wx.cloud.callHTTPFunction 调用时，平台注入 x-wx-openid / x-wx-appid
 *
 * 🚨 信任边界（务必理解后再上线）
 * 这两个头**没有任何签名**，只有「请求确实经过平台网关」时才可信。
 * 云函数一旦被公网直连（HTTP 访问服务 / 云托管自定义域名），
 * 客户端可以自己塞一行 `x-wx-openid: <别人的 openid>` 冒充身份。
 *
 * 本模板不提供「关闭信任」的开关 —— 部署前提就是
 * 「函数只经 callHTTPFunction 或集成中心网关调用」。
 * 需要公网直连时，请你自行在上游（API 网关 / 云托管）完成身份校验，
 * 不要依赖本文件。
 *
 * 🚨 为什么不再解析 Bearer JWT
 * JWT payload 只是 base64 编码，**任何人可伪造**；校验签名需要 CloudBase
 * 公钥，属于上游职责。没验签就采信，等于没有鉴权 —— 所以直接不支持。
 *
 * 采信的头值还必须过格式白名单，避免把任意字符串当身份往下传。
 */

/** 平台注入的 openid 形如 oXXXXXXXXXXXXXXXXXXXXXXXXXXX（28 位上下），放宽到 10–64 位安全字符 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

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

    return value;
}

/** 获取用户 openid（仅平台注入头一个来源） */
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
};

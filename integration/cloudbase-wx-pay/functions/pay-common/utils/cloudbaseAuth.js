/**
 * CloudBase Auth 工具
 *
 * 身份来源只有两个，其余一概不认：
 *
 *   1. `x-wx-openid` —— 小程序经 `wx.cloud.callHTTPFunction` / `callContainer`
 *      调用时由平台网关注入。前提：请求确实经过平台网关（公网直连时可伪造）。
 *   2. `Authorization: Bearer <JWT>` —— 云 API 网关已验证签名后转发，
 *      函数内只解码 payload，不再验签（也没有公钥可验）。
 *
 * 🚨 以下来源**一律不可信**，曾被误当作鉴权依据：
 *   - `x-tcb-integration-id` 等自定义 header：客户端可任意添加
 *   - `SCF_RUNTIME` / `TENCENTCLOUD_RUNENV`：云函数内恒存在，无法证明「本次请求经过了网关」
 *   - `x-wx-source` / `x-authmethod`：同样是客户端可伪造的普通 header
 */

/** CloudBase openid 形态：10-64 位安全字符，避免把任意字符串当身份往下传 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * 校验 openid 格式
 * @param {*} value
 * @returns {string|null} 合法则返回 trim 后的值
 */
function normalizeOpenId(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return OPENID_RE.test(trimmed) ? trimmed : null;
}

/**
 * 从 Authorization header 解析 CloudBase Auth 用户信息
 *
 * 流程：前端 CloudBase SDK 登录 → 拿到 accessToken（JWT）→ 调云 API 时带上
 *      → 网关验证签名 → 转发到云函数
 *
 * ⚠️ 这里只做 base64 解码，**不验签**：验签是网关的职责，函数内也没有公钥。
 *    因此只有在「请求必经网关」的前提下，解析结果才可信。
 *
 * @param {Object} req - Express request 对象
 * @returns {Object|null} JWT payload，解析失败返回 null
 */
function parseCloudBaseAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    try {
        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64').toString('utf8')
        );

        return payload;
    } catch (err) {
        console.warn('[CloudBaseAuth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 从请求中获取 openid
 *
 * 优先级：平台注入的 x-wx-openid → Bearer JWT 的 provider_sub
 *
 * @param {Object} req - Express request 对象
 * @returns {string|null}
 */
function getOpenId(req) {
    // 1) 平台注入：callHTTPFunction / callContainer，最直接可信
    const wxOpenId = normalizeOpenId(req.headers['x-wx-openid']);
    if (wxOpenId) return wxOpenId;

    // 2) CloudBase Auth：provider_sub 是微信 openid，sub 是 CloudBase UID
    const authInfo = parseCloudBaseAuth(req);
    const jwtOpenId = normalizeOpenId(authInfo?.provider_sub);
    if (jwtOpenId) return jwtOpenId;

    // 3) 仅 H5 演示路由（h5SecurityMiddleware 会置 allowBodyOpenid）
    //    ⚠️ body 里的 openid 完全由客户端提供，可冒用他人身份。
    //    生产必须换成服务端 session 校验，这里只为让 H5 示例能跑通。
    if (req.allowBodyOpenid) {
        const bodyOpenId = normalizeOpenId(req.body?.payer?.openid);
        if (bodyOpenId) {
            console.warn('[CloudBaseAuth] ⚠️ 采信 body.payer.openid（H5 演示路径，生产必须替换）');
            return bodyOpenId;
        }
    }

    return null;
}

module.exports = { parseCloudBaseAuth, getOpenId, normalizeOpenId, OPENID_RE };

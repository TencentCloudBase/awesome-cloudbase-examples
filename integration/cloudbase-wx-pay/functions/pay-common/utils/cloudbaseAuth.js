/**
 * CloudBase Auth 工具
 * 从云 API 网关透传的 Authorization header 中解析用户信息
 *
 * 流程：前端 CloudBase SDK 登录 → 拿到 accessToken（JWT）→ 调云 API 时带上 → 网关验证 → 转发到云函数
 * 云函数从 header 中解码 JWT payload 获取用户身份（openid 等）
 *
 * 注意：JWT 的验签由云 API 网关完成，云函数里只需解码 payload，不需要验签
 */

/**
 * 从 Authorization header 解析 CloudBase Auth 用户信息
 * @param {Object} req - Express request 对象
 * @returns {Object|null} 用户信息（包含 uid/openid 等），解析失败返回 null
 */
function parseCloudBaseAuth(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    try {
        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // JWT payload 是第二段，base64url 解码
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
 * 优先级：JWT payload → 请求体 payer.openid → null
 * @param {Object} req - Express request 对象
 * @returns {string|null}
 */
function getOpenId(req) {
    // 1. 尝试从 JWT 解析
    const authInfo = parseCloudBaseAuth(req);
    if (authInfo) {
        // CloudBase Auth JWT 结构（已验证）：
        // provider_sub = openid（微信小程序 signInWithOpenId 登录）
        // sub = CloudBase UID
        const openid = authInfo.provider_sub;
        if (openid) {
            console.info('[CloudBaseAuth] 从 JWT 获取 openid:', openid);
            return openid;
        }
    }

    // 2. 回退到请求体中的 payer.openid（HTTP 访问服务直接调用方式）
    if (req.body?.payer?.openid) {
        return req.body.payer.openid;
    }

    return null;
}

module.exports = { parseCloudBaseAuth, getOpenId };

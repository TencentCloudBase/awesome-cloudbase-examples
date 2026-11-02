/**
 * CloudBase Auth 工具
 *
 * 与微信支付模板的差异：
 * - 微信支付模板可用 x-wx-openid（平台注入的小程序用户标识）
 * - Stripe 面向海外 Web / CloudBase Auth 场景，没有 openid 概念
 *   用户身份统一从 JWT（Bearer accessToken）中解析，取 uid / email
 */

/**
 * 从 Authorization header 解析 CloudBase Auth 用户信息
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

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload;
    } catch (err) {
        console.warn('[Auth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 获取当前用户 UID（CloudBase Auth）
 * @param {Object} req
 * @returns {string|null}
 */
function getUserId(req) {
    const authInfo = parseCloudBaseAuth(req);
    return authInfo?.sub || authInfo?.uid || null;
}

/**
 * 获取当前用户邮箱（可用于预填 Stripe customer_email）
 * @param {Object} req
 * @returns {string|null}
 */
function getUserEmail(req) {
    const authInfo = parseCloudBaseAuth(req);
    return authInfo?.email || authInfo?.provider_email || null;
}

module.exports = { parseCloudBaseAuth, getUserId, getUserEmail };

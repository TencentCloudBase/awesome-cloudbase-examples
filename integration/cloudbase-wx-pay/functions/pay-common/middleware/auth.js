/**
 * 鉴权中间件（独立文件，避免被 controller → service → SDK 依赖拖累）
 *
 * 只认两个身份来源：
 *   1. `x-wx-openid` —— callHTTPFunction / callContainer 由平台网关注入
 *   2. `Authorization: Bearer <JWT>` —— 云 API 网关已验签后转发
 *
 * 🚨 曾经放行、现已删除的分支（都是假保护）：
 *   - `x-tcb-integration-id`：自定义 header，客户端随便加一行就过
 *   - `x-wx-source` / `x-authmethod`：同上，纯 header 判断
 *   - `TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`：云函数内**恒存在**，
 *     该分支永远命中，等于中间件无条件放行
 */

const { parseCloudBaseAuth, normalizeOpenId } = require('../utils/cloudbaseAuth');

/**
 * 业务路由鉴权
 */
function payMiddleware(req, res, next) {
    // 1) 平台注入身份（小程序形态）
    const openid = normalizeOpenId(req.headers['x-wx-openid']);
    if (openid) {
        req.user = { openid };
        return next();
    }

    // 2) CloudBase Auth Bearer（H5 / 服务端形态）
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const authInfo = parseCloudBaseAuth(req);
        if (authInfo) {
            req.cloudbaseAuth = authInfo;
            return next();
        }
        console.warn('[鉴权] Bearer token 无法解析');
    }

    console.warn('[鉴权] 拒绝匿名调用:', req.method, req.path,
        '（需平台注入 x-wx-openid 或 CloudBase Auth Bearer token）');
    return res.status(401).json({ code: -1, msg: '未授权访问' });
}

/**
 * H5 路由鉴权
 *
 * ⚠️ 与 payMiddleware 的差别：H5 没有平台注入的 `x-wx-openid`，
 *    身份来自自建 OAuth（前端登录后把 openid 放在 body 里传上来），
 *    因此这里放开 `req.allowBodyOpenid`。
 *
 * 🚨 **body 里的 openid 客户端可伪造**，等于这一层不做身份校验，
 *    只做 Origin 白名单。生产环境必须把身份换成服务端 session：
 *    前端带 `Authorization: Bearer <token>`，由后端会话/网关验签后再取 openid，
 *    并把 allowBodyOpenid 关掉。
 */
function h5SecurityMiddleware(req, res, next) {
    // H5 演示路径：允许从 body.payer.openid 取身份（getOpenId 会打警告日志）
    req.allowBodyOpenid = true;

    // Origin 白名单校验（微信支付安全规范要求）
    const allowedOrigins = process.env.corsAllowOrigin
        ? process.env.corsAllowOrigin.split(',').map(s => s.trim())
        : [];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
        console.warn('[H5Security] Origin 被拒绝:', origin, '白名单:', allowedOrigins);
        return res.status(403).json({ code: -1, msg: 'Origin 不在白名单内' });
    }

    if (allowedOrigins.length === 0 && origin) {
        console.warn('[H5Security] ⚠️ 未配置 Origin 白名单，所有来源均放行。建议设置环境变量 corsAllowOrigin');
    }

    return next();
}

module.exports = { payMiddleware, h5SecurityMiddleware };

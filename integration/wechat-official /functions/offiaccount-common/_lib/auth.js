/**
 * CloudBase Auth + 鉴权中间件
 * 从云 API 网关透传的 Authorization header 中解析用户信息
 *
 * 流程：前端 CloudBase SDK 登录 → 拿到 accessToken（JWT）→ 调云 API 时带上 → 网关验证 → 转发到云函数
 * 云函数从 header 中解码 JWT payload 获取用户身份（openid 等）
 *
 * 注意：JWT 的验签由云 API 网关完成，云函数里只需解码 payload，不需要验签
 */

// ========== JWT 解析 ==========

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
        console.warn('[Auth] JWT 解析失败:', err.message);
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
        // CloudBase Auth JWT 结构：
        // provider_sub = openid（微信小程序 signInWithOpenId 登录）
        // sub = CloudBase UID
        const openid = authInfo.provider_sub;
        if (openid) {
            console.info('[Auth] 从 JWT 获取 openid:', openid);
            return openid;
        }
    }

    // 2. 回退到请求体中的 payer.openid（HTTP 访问服务直接调用方式）
    if (req.body?.payer?.openid) {
        return req.body.payer.openid;
    }

    return null;
}

// ========== 鉴权中间件 ==========

/**
 * 鉴权中间件
 * 兼容多种部署方式：云 API 网关、集成中心网关、HTTP 云函数、云托管、本地开发
 */
function authMiddleware(options = {}) {
    const { functionName = '' } = options;

    return (req, res, next) => {
        // ⚠️ 开发环境提示（不跳过鉴权，仅打印日志辅助排查）
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[鉴权:${functionName}] 开发环境 — 鉴权仍然生效`);
        }

        // 1. 云 API 网关模式：Bearer token（CloudBase Auth accessToken）
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const authInfo = parseCloudBaseAuth(req);
            if (authInfo) {
                req.cloudbaseAuth = authInfo;
                return next();
            }
        }

        // 2. 集成中心网关模式
        // 安全前提：集成中心网关会剥离客户端传入的 x-tcb-integration-id，仅网关自身注入
        if (req.headers['x-tcb-integration-id']) {
            return next();
        }

        // 3. 云托管模式（callContainer）
        // 安全前提：云托管入口会剥离客户端传入的 X-WX-SOURCE / X-Authmethod
        const authMethod = req.headers['x-authmethod'] || req.headers['X-Authmethod'];
        const wxSource = req.headers['x-wx-source'];
        if (wxSource === 'wx_devtools' || wxSource === 'wx_client' || authMethod === 'WX_SERVER_AUTH') {
            return next();
        }

        // 4. HTTP 云函数模式
        // 安全前提：这些环境变量仅存在于 SCF 运行时，外部无法伪造
        if (process.env.TENCENTCLOUD_RUNENV || process.env.SCF_RUNTIME) {
            return next();
        }

        res.status(401).json({ code: -1, msg: '未授权访问' });
    };
}

/**
 * H5 安全中间件
 * 先走鉴权，再做 H5 特有的安全校验（Origin 白名单等）
 */
function h5SecurityMiddleware(options = {}) {
    const middleware = authMiddleware(options);

    return (req, res, next) => {
        middleware(req, res, (err) => {
            if (err) return next(err);

            // H5 Origin 白名单校验
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

            next();
        });
    };
}

module.exports = {
    parseCloudBaseAuth,
    getOpenId,
    authMiddleware,
    h5SecurityMiddleware,
};

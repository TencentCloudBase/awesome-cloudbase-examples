/**
 * 鉴权中间件（独立文件，避免被 controller → service → SDK 依赖拖累）
 *
 * 只认两个身份来源：
 *   1. `x-wx-openid` —— callHTTPFunction / callContainer 由平台网关注入
 *   2. `Authorization: Bearer <JWT>` —— 云 API 网关已验签后转发
 *
 * ⚠️ Bearer 分支的前提是「请求必经网关、函数端口不对外」。
 *    函数内无法验签，只能校验 payload 内容（主体标识 / exp / iss），
 *    所以**必须确认前置网关强制验签，且禁止公网直连函数端口**（Dockerfile 暴露的 80 端口
 *    只应被网关或容器内网访问）。做不到时不要部署公网直连形态。
 *
 * 🚨 曾经放行、现已删除的分支（都是假保护）：
 *   - `x-tcb-integration-id`：自定义 header，客户端随便加一行就过
 *   - `x-wx-source` / `x-authmethod`：同上，纯 header 判断
 *   - `TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`：云函数内**恒存在**，
 *     该分支永远命中，等于中间件无条件放行
 */

const {
    resolveAuthIdentity,
    isBodyOpenIdFallbackEnabled,
} = require('../utils/cloudbaseAuth');

/**
 * 解析请求来源：Origin 优先，缺失时回退 Referer 的 origin 部分
 *
 * @param {Object} req - Express request 对象
 * @returns {string|null} 取不到返回 null（调用方按「无法校验来源」处理）
 */
function resolveRequestOrigin(req) {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.trim()) return origin.trim();

    // 老浏览器 / 部分非 CORS 场景不发 Origin，用 Referer 兜一层
    const referer = req.headers.referer || req.headers.referrer;
    if (typeof referer === 'string' && referer.trim()) {
        try {
            return new URL(referer.trim()).origin;
        } catch (err) {
            console.warn('[H5Security] Referer 无法解析为 origin:', referer);
            return null;
        }
    }

    return null;
}

/**
 * 业务路由鉴权
 *
 * ⚠️ 放行契约：放行时一定把身份挂到 `req.user.openid`，
 *    保证「中间件放行」与 `getOpenId(req)` 取到身份是一致的。
 *    Bearer 凭证里没有微信 openid（provider_sub）时直接 401 —— 支付写接口
 *    必须有 openid，放行后再在参数校验层失败只会把「未授权」误报成「参数错误」。
 */
function payMiddleware(req, res, next) {
    const identity = resolveAuthIdentity(req, { allowBodyOpenid: false });

    if (identity.openid) {
        req.user = { openid: identity.openid, source: identity.source };
        if (identity.authInfo) req.cloudbaseAuth = identity.authInfo;
        return next();
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        console.warn('[鉴权] Bearer 凭证不含有效微信 openid（provider_sub），不能用于支付写接口');
    }

    console.warn('[鉴权] 拒绝匿名调用:', req.method, req.path,
        '（需平台注入 x-wx-openid 或 CloudBase Auth Bearer token）');
    return res.status(401).json({ code: -1, msg: '未授权访问' });
}

/**
 * H5 路由鉴权
 *
 * 与 payMiddleware 的差别：H5 拿不到平台注入的 `x-wx-openid`，只能靠登录态。
 * 因此这里做三件事，缺一不可：
 *   1. Origin / Referer 白名单（**缺失即拒绝**，浏览器同源 POST 不带 Origin 时走 Referer）
 *   2. 登录态：必须有 CloudBase Auth Bearer 凭证（跨站请求拿不到 token，即 CSRF 防护）
 *   3. 身份只从服务端可验证来源取，不再无条件采信 body.payer.openid
 *
 * ⚠️ 放行口径（与 payMiddleware 的**唯一**差别）：
 *   - payMiddleware：必须有 openid（JSAPI / 退款 / 转账要知道微信身份）
 *   - 本中间件：openid 或 UID 任一非空即放行 —— H5（MWEB）常在微信外浏览器发起，
 *     CloudBase Auth 凭证里只有 `sub`（UID）、没有 `provider_sub`（微信 openid），
 *     强制要 openid 会让 H5 下单对非微信渠道用户完全不可用。
 *   - 因此放行契约是：**放行 ⇒ getOpenId(req) 或 getUid(req) 至少取到一个**。
 *     只有 UID 时订单归属按 UID 记录，控制器不得依赖 openid 落库。
 *
 * 演示用途要放开匿名调用，必须显式设 `ALLOW_ANONYMOUS_H5=true`（默认关闭）；
 * 要放开 body.payer.openid 回退，必须显式设 `ALLOW_BODY_OPENID=true` **且** 配置 `corsAllowOrigin`。
 */
function h5SecurityMiddleware(req, res, next) {
    // ① 来源白名单：未配置白名单 = 不知道该信谁，一律拒绝（不静默放行）
    const allowedOrigins = (process.env.corsAllowOrigin || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    if (allowedOrigins.length === 0) {
        console.error('[H5Security] 未配置 corsAllowOrigin，拒绝请求：H5 写接口必须有来源白名单');
        return res.status(403).json({
            code: -1,
            msg: '未配置 Origin 白名单（环境变量 corsAllowOrigin）',
        });
    }

    const requestOrigin = resolveRequestOrigin(req);
    if (!requestOrigin) {
        // 浏览器同源的简单请求（如 text/plain POST）可能不带 Origin，
        // 此时 Referer 也拿不到就无法校验来源 —— CSRF 场景正是这种请求，必须拒绝
        console.warn('[H5Security] 请求缺少 Origin 与 Referer，无法校验来源，拒绝');
        return res.status(403).json({ code: -1, msg: '缺少 Origin/Referer，无法校验请求来源' });
    }

    if (!allowedOrigins.includes(requestOrigin)) {
        console.warn('[H5Security] Origin 被拒绝:', requestOrigin, '白名单:', allowedOrigins);
        return res.status(403).json({ code: -1, msg: 'Origin 不在白名单内' });
    }

    // ② 登录态：H5 没有平台注入头，必须有服务端可验证的身份（Bearer / x-wx-openid）
    const identity = resolveAuthIdentity(req, {
        allowBodyOpenid: isBodyOpenIdFallbackEnabled(),
    });

    if (!identity.openid && !identity.uid) {
        if (process.env.ALLOW_ANONYMOUS_H5 !== 'true') {
            console.warn('[H5Security] 拒绝未登录请求:', req.method, req.path,
                '（需 Authorization: Bearer <CloudBase Auth token>；'
                + '本地联调可设 ALLOW_ANONYMOUS_H5=true）');
            return res.status(401).json({
                code: -1,
                msg: 'H5 下单需要登录态（Authorization: Bearer <token>）',
            });
        }
        console.warn('[H5Security] ⚠️ ALLOW_ANONYMOUS_H5 已开启，放行未登录请求（生产不应开启）');
        return next();
    }

    // 只有 UID 没有 openid：合法放行，但订单归属只能用 UID，明确打日志便于排障
    if (!identity.openid) {
        console.warn('[H5Security] 凭证不含微信 openid（provider_sub），本次以 UID 作为订单归属:',
            identity.uid, '（H5 常见于微信外浏览器登录）');
    }

    req.user = {
        openid: identity.openid,
        uid: identity.uid,
        source: identity.source,
    };
    // 只有「确无其它身份来源 + 显式开关」时才是 body 回退，供 getOpenId 识别
    req.allowBodyOpenid = identity.source === 'body';

    return next();
}

module.exports = { payMiddleware, h5SecurityMiddleware, resolveRequestOrigin };

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

const { resolveAuthIdentity } = require('../utils/cloudbaseAuth');

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
 * ⚠️ 放行契约：放行时 `req.user` 一定挂上 `openid` 与 `uid`（缺的那个为 null），
 *    且至少有一个非空 —— 与 h5SecurityMiddleware 的口径保持一致，
 *    避免「同一个 Bearer token 在 H5 路由能用、在小程序路由被判成匿名」。
 *
 * Bearer 凭证只有微信渠道登录才带 `provider_sub`（openid）；H5 / Web / App
 * 渠道登录只有 `sub`（UID）。这类身份在支付写接口上仍然合法（归属按 UID 记），
 * 因此这里不拦，由各路由按自身需要取舍：例如 JSAPI 下单必须有 openid，
 * 就在控制器里回 403 并说明原因，而不是把「身份类型不满足」混成 401 匿名。
 */
function payMiddleware(req, res, next) {
    const identity = resolveAuthIdentity(req);

    if (identity.openid || identity.uid) {
        req.user = {
            openid: identity.openid || null,
            uid: identity.uid || null,
            source: identity.source,
        };
        if (identity.authInfo) req.cloudbaseAuth = identity.authInfo;
        if (!identity.openid) {
            console.info('[鉴权] 凭证不含 provider_sub，本次以 UID 作为身份:', identity.uid);
        }
        return next();
    }

    console.warn('[鉴权] 拒绝匿名调用:', req.method, req.path,
        '（需平台注入 x-wx-openid 或 CloudBase Auth Bearer token）');
    return res.status(401).json({ code: -1, msg: '未授权访问' });
}

/**
 * JSAPI / 小程序下单专用：必须有微信 openid（`provider_sub`）
 *
 * payMiddleware 允许「只有 UID」的身份通过（与 H5 路由口径一致），但 JSAPI 下单
 * 必须知道付款人的微信身份，否则只能等参数校验报「参数错误」。
 * 这里在路由层把它拦成 **403 + 明确原因**：有凭证但身份类型不满足 ≠ 未登录。
 */
function requireWechatOpenId(req, res, next) {
    if (req.user?.openid) return next();

    console.warn('[鉴权] JSAPI 下单缺少微信 openid（provider_sub），拒绝:', req.method, req.path,
        '（uid =', req.user?.uid || '无', '）');
    return res.status(403).json({
        code: -1,
        msg: 'JSAPI 下单需要微信 openid（凭证缺 provider_sub），请使用微信渠道登录',
    });
}

/**
 * H5 路由鉴权
 *
 * 与 payMiddleware 的差别：H5 拿不到平台注入的 `x-wx-openid`，只能靠登录态。
 * 因此这里做三件事，缺一不可：
 *   1. Origin / Referer 白名单（**缺失即拒绝**，浏览器同源 POST 不带 Origin 时走 Referer）
 *   2. 登录态：必须有 CloudBase Auth Bearer 凭证（跨站请求拿不到 token，即 CSRF 防护）
 *   3. 身份只从服务端可验证来源取：平台注入 header 或 Bearer JWT，
 *      **body.payer.openid 已彻底移除**（客户端可填别人的 openid）
 *
 * ⚠️ 放行口径（与 payMiddleware 的**唯一**差别）：
 *   - payMiddleware：必须有 openid（JSAPI / 退款 / 转账要知道微信身份）
 *   - 本中间件：openid 或 UID 任一非空即放行 —— H5（MWEB）常在微信外浏览器发起，
 *     CloudBase Auth 凭证里只有 `sub`（UID）、没有 `provider_sub`（微信 openid），
 *     强制要 openid 会让 H5 下单对非微信渠道用户完全不可用。
 *   - 因此放行契约是：**放行 ⇒ getOpenId(req) 或 getUid(req) 至少取到一个**。
 *     只有 UID 时订单归属按 UID 记录，控制器不得依赖 openid 落库。
 *
 * 演示用途要放开匿名调用，必须显式设 `ALLOW_ANONYMOUS_H5=true`（默认关闭）。
 *
 * 🚨 曾经还有一层 `ALLOW_BODY_OPENID` + `corsAllowOrigin` 的 body.payer.openid 回退，
 *    **已整层删除**：身份只从「平台注入 header」或「网关验过的 Bearer」取，
 *    两套场景按路由分开（小程序路由 = x-wx-openid；H5/Web = Bearer），不在一处做优先级合并。
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
    const identity = resolveAuthIdentity(req);

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

    return next();
}

module.exports = { payMiddleware, h5SecurityMiddleware, requireWechatOpenId, resolveRequestOrigin };

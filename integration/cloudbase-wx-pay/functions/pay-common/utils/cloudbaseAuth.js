/**
 * CloudBase Auth 工具
 *
 * 身份来源只有两个，其余一概不认（按路由区分用哪一个，不做多来源合并）：
 *
 *   1. 小程序路由（`/wxpay_order`、`/wxpay_order_native`、退款、转账）：
 *      `x-wx-openid` —— `wx.cloud.callHTTPFunction` / `callContainer` 由平台网关注入。
 *      前提：请求确实经过平台网关（公网直连时可伪造）。
 *   2. Web / App 路由（`/wxpay_order_h5`）：`Authorization: Bearer <JWT>` —— 云 API 网关
 *      已验证签名后转发，函数内只解码 payload，不再验签（也没有公钥可验）。
 *
 * ⚠️ 「不验签」不等于「不校验」：payload 必须含主体标识、exp 未过期、
 *    iss 符合预期（如配置），否则任何人拼一个 `Bearer a.<base64('{}')>.b` 就能过鉴权。
 *
 * 🚨 以下来源**一律不可信**，曾被误当作鉴权依据：
 *   - `x-tcb-integration-id` 等自定义 header：客户端可任意添加
 *   - `SCF_RUNTIME` / `TENCENTCLOUD_RUNENV`：云函数内恒存在，无法证明「本次请求经过了网关」
 *   - `x-wx-source` / `x-authmethod`：同样是客户端可伪造的普通 header
 *   - `body.payer.openid`：请求体字段，客户端可填别人的 openid
 *     （**已连同 `ALLOW_BODY_OPENID` 开关一并删除**：请求体由调用方完全控制，
 *      采信它等于「允许调用方自己指定我是谁」，且 `orderService.resolveOwner`
 *      也曾把它当归属候选，会污染落库的订单归属）
 */

/** CloudBase openid 形态：10-64 位安全字符，避免把任意字符串当身份往下传 */
const OPENID_RE = /^[A-Za-z0-9_-]{10,64}$/;

/**
 * CloudBase UID 形态：JWT 的 sub，不是 openid，格式比 openid 宽松
 * （各登录渠道的 sub 可能是 uuid、手机号、邮箱等），但仍要挡住空串和超长脏值
 */
const UID_RE = /^[A-Za-z0-9_.@:-]{3,128}$/;

/** exp 允许的时钟偏移（秒）：云函数与签发方可能有秒级时间差 */
const CLOCK_SKEW_SEC = 60;

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
 * 校验 UID 格式（CloudBase UID，非 openid）
 * @param {*} value
 * @returns {string|null} 合法则返回 trim 后的值
 */
function normalizeUid(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return UID_RE.test(trimmed) ? trimmed : null;
}

/**
 * 取 JWT payload 的主体标识（sub 优先，回退 provider_sub）
 * @param {Object} payload
 * @returns {string|null}
 */
function pickSubject(payload) {
    const raw = payload.sub ?? payload.provider_sub;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
    return null;
}

/**
 * 校验 JWT payload 的完整性与内容
 *
 * 只做「解码后能看到的东西」：主体标识、有效期、签发方。
 * 签名校验仍是网关职责 —— 前提是函数只经网关暴露，不允许公网直连函数端口。
 *
 * @param {Object} payload
 * @returns {boolean}
 */
function isValidAuthPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        console.warn('[CloudBaseAuth] JWT payload 不是对象，拒绝');
        return false;
    }

    // 主体标识：没有 sub / provider_sub 的 payload 代表不了任何用户
    if (!pickSubject(payload)) {
        console.warn('[CloudBaseAuth] JWT payload 缺少 sub / provider_sub，拒绝');
        return false;
    }

    if (payload.exp !== undefined) {
        const exp = Number(payload.exp);
        if (!Number.isFinite(exp)) {
            console.warn('[CloudBaseAuth] JWT exp 非法，拒绝');
            return false;
        }
        if (exp + CLOCK_SKEW_SEC <= Math.floor(Date.now() / 1000)) {
            console.warn('[CloudBaseAuth] JWT 已过期，拒绝');
            return false;
        }
    }

    // iss 可选校验：配了就必须匹配，没配就不校验（各家签发方不同）
    const expectedIss = (process.env.AUTH_EXPECTED_ISSUER || '').trim();
    if (expectedIss && payload.iss !== expectedIss) {
        console.warn('[CloudBaseAuth] JWT iss 不符合预期，拒绝');
        return false;
    }

    return true;
}

/**
 * 从 Authorization header 解析 CloudBase Auth 用户信息
 *
 * 流程：前端 CloudBase SDK 登录 → 拿到 accessToken（JWT）→ 调云 API 时带上
 *      → 网关验证签名 → 转发到云函数
 *
 * ⚠️ 这里只做 base64 解码，**不验签**：验签是网关的职责，函数内也没有公钥。
 *    因此只有在「请求必经网关」的前提下，解析结果才可信。
 *    即便如此，仍要校验 payload 内容，否则 `Bearer a.<base64('{}')>.b` 也能通过。
 *
 * @param {Object} req - Express request 对象
 * @returns {Object|null} JWT payload，解析失败或内容不合法返回 null
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

        return isValidAuthPayload(payload) ? payload : null;
    } catch (err) {
        console.warn('[CloudBaseAuth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 解析请求身份（唯一入口：中间件与 getOpenId 都用这一份契约）
 *
 * 只认两个服务端可验证来源：
 *   1. 平台注入的 `x-wx-openid`（小程序调用，网关注入）
 *   2. Bearer JWT 的 `provider_sub`（微信 openid），`sub` 作为 CloudBase UID
 *
 * 🚨 已经没有第三层「body.payer.openid 回退」：
 *    请求体由调用方完全控制，采信它 = 允许调用方自己指定我是谁。
 *    订单归属同理，`orderService.resolveOwner` 只认 identity，不看 `params.payer`。
 *
 * @param {Object} req - Express request 对象
 * @returns {{openid: string|null, uid: string|null, source: string|null, authInfo: Object|null}}
 */
function resolveAuthIdentity(req) {
    // 1) 平台注入：callHTTPFunction / callContainer，最直接可信
    const wxOpenId = normalizeOpenId(req.headers['x-wx-openid']);
    if (wxOpenId) {
        return { openid: wxOpenId, uid: null, source: 'platform-header', authInfo: null };
    }

    // 2) CloudBase Auth：provider_sub 是微信 openid，sub 是 CloudBase UID
    const authInfo = parseCloudBaseAuth(req);
    if (authInfo) {
        return {
            openid: normalizeOpenId(authInfo.provider_sub),
            uid: pickSubject(authInfo),
            source: 'bearer',
            authInfo,
        };
    }

    return { openid: null, uid: null, source: null, authInfo: null };
}

/**
 * 从请求中获取 openid
 *
 * 优先级：中间件挂载的 req.user.openid → 平台注入的 x-wx-openid → Bearer JWT 的 provider_sub
 *
 * ⚠️ 与 payMiddleware 的契约：**中间件放行 ⇒ 这里一定能取到 openid**。
 *    中间件放行时已把身份挂到 req.user，避免「过了鉴权但取不到身份」的不一致。
 *
 * @param {Object} req - Express request 对象
 * @returns {string|null}
 */
function getOpenId(req) {
    // 0) 中间件已解析并挂载的身份（权威，避免重复解析出现口径不一致）
    const mounted = normalizeOpenId(req.user?.openid);
    if (mounted) return mounted;

    const identity = resolveAuthIdentity(req);
    return identity.openid;
}

/**
 * 从请求中获取 CloudBase UID（JWT 的 sub）
 *
 * 用途：H5 等非微信渠道登录时，凭证里只有 UID、没有微信 openid
 * （JWT 没有 provider_sub）。这类身份下单后订单归属只能用 UID 记录 ——
 * 若只认 openid，就会出现「中间件放行、控制器取不到身份」的契约断裂。
 *
 * ⚠️ 与 h5SecurityMiddleware 的契约：**中间件放行 ⇒ getOpenId 或 getUid 至少取到一个**。
 *
 * @param {Object} req - Express request 对象
 * @returns {string|null}
 */
function getUid(req) {
    // 0) 中间件已解析并挂载的身份（权威，避免重复解析出现口径不一致）
    const mounted = normalizeUid(req.user?.uid);
    if (mounted) return mounted;

    const identity = resolveAuthIdentity(req);
    return identity.uid;
}

module.exports = {
    parseCloudBaseAuth,
    resolveAuthIdentity,
    getOpenId,
    getUid,
    normalizeOpenId,
    normalizeUid,
    OPENID_RE,
    UID_RE,
};

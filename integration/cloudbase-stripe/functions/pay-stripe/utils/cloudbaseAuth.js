/**
 * CloudBase Auth 工具
 *
 * 与微信支付模板的差异：
 * - 微信支付模板可用 x-wx-openid（平台注入的小程序用户标识）
 * - Stripe 面向海外 Web / CloudBase Auth 场景，没有 openid 概念
 *   用户身份统一从 JWT（Bearer accessToken）中解析，取 uid / email
 *
 * ⚠️ 鉴权身份来自网关注入的 `x-userid` / `x-authmethod`（见 resolveAuthIdentity）。
 *    JWT payload 只用于回填邮箱等展示信息，不参与鉴权；即便如此，解析时仍要求
 *    主体标识、exp、iss 三者齐备（fail closed），避免脏值流入业务字段。
 *
 * 🚨 以下来源**一律不可信**，曾被误当作鉴权依据（已从 resolveAuthIdentity 删除）：
 *   - `x-tcb-integration-id` 等自定义 header：客户端可任意添加
 *   - `x-wx-source` / `x-authmethod`：同样是客户端可伪造的普通 header
 *   - `TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`：云函数运行时**恒存在**，
 *     该分支永远命中 = 鉴权无条件放行
 *   - `x-wx-openid`：格式校验（10-64 位字符）不是来源证明。即便它确由平台网关注入，
 *     只要函数存在一条公网直连路径，调用方加一行
 *     `curl -H 'x-wx-openid: attacker001'` 就能冒用任意身份下单。
 *     本模板面向海外 Web，没有 openid 语义，唯一可信来源只保留 Bearer JWT。
 */

/** CloudBase UID 形态（JWT 的 sub）：各登录渠道可能是 uuid / 手机号 / 邮箱，但仍挡住空串与超长脏值 */
const UID_RE = /^[A-Za-z0-9_.@:-]{3,128}$/;

/** exp 允许的时钟偏移（秒）：云函数与签发方可能有秒级时间差 */
const CLOCK_SKEW_SEC = 60;

/** 邮箱格式：与 controllers/stripeController.js 的 EMAIL_RE 同口径；254 为 RFC 5321 长度上限 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LEN = 254;

/**
 * 归一化邮箱：JWT payload 是客户端可控的解码结果，email 可能是数组 / 对象 / 超长脏值。
 * 该值在 customer_email 的 EMAIL_RE 校验之后才回填，必须自带类型 + 格式 + 长度判断，
 * 否则脏值绕过校验直接进入 Stripe 下单参数。
 * @param {*} raw
 * @returns {string|null}
 */
function normalizeEmail(raw) {
    if (typeof raw !== 'string') return null;
    const v = raw.trim();
    return v.length <= MAX_EMAIL_LEN && EMAIL_RE.test(v) ? v : null;
}

/**
 * 校验 UID 格式
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
    // 与 normalizeUid 同口径：只接受字符串主体标识。
    // 曾把 number 直接 String(raw)：JSON.parse 对 20 位以上整数已丢精度，
    // String(12345678901234567890) === '12345678901234567000' 仍能过 UID_RE，
    // 订单会被挂到错误用户；1e21 又变成 '1e+21' 被挡住，结果依赖正则白名单而非 uid 真实形态。
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    return null;
}

/**
 * 校验 JWT payload 的完整性与内容
 *
 * 只做「解码后能看到的东西」：主体标识、有效期、签发方。
 *
 * @param {Object} payload
 * @returns {boolean}
 */
function isValidAuthPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        console.warn('[Auth] JWT payload 不是对象，拒绝');
        return false;
    }

    // 没有 sub / provider_sub 的 payload 代表不了任何用户
    if (!pickSubject(payload)) {
        console.warn('[Auth] JWT payload 缺少 sub / provider_sub，拒绝');
        return false;
    }

    // exp 是强制字段：文件头契约明确「主体标识、exp、iss 缺一不可」。
    // 曾写成 `if (payload.exp !== undefined)`，缺 exp 的 payload 会跳过全部过期判断，
    // 等于接受一张永不过期的身份凭证 —— 可长期冒用任意 uid 下单。默认 fail closed。
    if (payload.exp === undefined) {
        console.warn('[Auth] JWT payload 缺少 exp，拒绝');
        return false;
    }
    // 🚨 不能先 Number(x) 再判断：Number([<未来时间戳>]) === <未来时间戳>，
    //    数组 / 包装对象 / 布尔会被隐式转换成合法时间戳，完整绕过下面的有限性与过期判断。
    //    payload 是客户端可构造的解码结果，这里只接受 number 或纯数字字符串（fail closed）。
    const rawExp = payload.exp;
    const expIsNumber = typeof rawExp === 'number' && Number.isFinite(rawExp);
    const expIsNumericString = typeof rawExp === 'string' && /^\d+$/.test(rawExp);
    if (!expIsNumber && !expIsNumericString) {
        console.warn('[Auth] JWT exp 类型非法，拒绝');
        return false;
    }
    const exp = Number(rawExp);
    if (!Number.isFinite(exp)) {
        console.warn('[Auth] JWT exp 非法，拒绝');
        return false;
    }
    if (exp + CLOCK_SKEW_SEC <= Math.floor(Date.now() / 1000)) {
        console.warn('[Auth] JWT 已过期，拒绝');
        return false;
    }

    // iss 强制存在（与文件头契约「主体标识、exp、iss 缺一不可」对齐）：
    // 缺失即 fail closed；配置了 AUTH_EXPECTED_ISSUER 时还要求精确匹配。
    if (typeof payload.iss !== 'string' || payload.iss.trim() === '') {
        console.warn('[Auth] JWT payload 缺少 iss，拒绝');
        return false;
    }
    const expectedIss = (process.env.AUTH_EXPECTED_ISSUER || '').trim();
    if (expectedIss && payload.iss !== expectedIss) {
        console.warn('[Auth] JWT iss 不符合预期，拒绝');
        return false;
    }

    return true;
}

/**
 * 从 Authorization header 解析 CloudBase Auth 用户信息
 *
 * 流程：前端 CloudBase SDK 登录 → 拿到 accessToken（JWT）→ 调云 API 时带上
 *      → 网关验证签名 → 转发到云函数 → 本函数只解码 + 校验 payload 内容
 *
 * @param {Object} req - Express request 对象
 * @returns {Object|null} JWT payload，解析失败或内容不合法返回 null
 */
function parseCloudBaseAuth(req) {
    const authHeader = (req && req.headers && req.headers.authorization) || '';
    if (!authHeader.startsWith('Bearer ')) return null;

    try {
        const token = authHeader.split(' ')[1];
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // 🚨 先做 base64url 字符集 + 长度白名单再解码：
        //    Buffer.from(str,'base64') 是宽容解码，非法字符会被静默跳过，
        //    畸形段能解出半截 JSON 而进入后续校验。JWT 的 payload 段按规范是 base64url。
        const segment = parts[1];
        if (!/^[A-Za-z0-9_-]{2,8192}$/.test(segment)) return null;
        const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
        return isValidAuthPayload(payload) ? payload : null;
    } catch (err) {
        console.warn('[Auth] JWT 解析失败:', err.message);
        return null;
    }
}

/**
 * 解析请求身份（中间件与业务取的唯一口径）
 *
 * 唯一可信来源：**网关鉴权后注入的 header**
 *   - `x-userid`     网关注入的已认证用户标识
 *   - `x-authmethod` 网关鉴权方式；未通过时为 `UNAUTHORIZED`
 *
 * 🚨 为什么不再解析 Bearer JWT：
 *    函数侧没有验签公钥（JWKS 接口一律 401），只 base64 解码 payload 等于假鉴权 ——
 *    `Authorization: Bearer x.<自己拼的payload>.y` 就能冒用任意 uid。
 *
 * 🚨 为什么可以信 `x-userid`：
 *    2026-11-05 实测（环境 lowcode-0gwpl9v4125156ef），从集成回调域名发请求并
 *    主动伪造 `x-userid: attacker999` / `x-usertype: user` / `x-administrator: true`，
 *    函数实际收到的是 `x-userid: null`、`x-usertype: NONE`、`x-authmethod: UNAUTHORIZED`——
 *    网关会覆盖客户端自带的同名 header，未认证请求拿不到身份。
 *
 * ⚠️ 因此必须同时要求 `x-authmethod` 存在且不为 UNAUTHORIZED：
 *    只判 `x-userid` 非空不够，回调入口那条路由（身份认证关闭）必须被拒。
 *
 * @param {Object} req
 * @returns {{uid: string|null, source: string|null, authInfo: Object|null}}
 */
function resolveAuthIdentity(req) {
    const headers = (req && req.headers) || {};
    const authMethod = String(headers['x-authmethod'] || '').trim();
    const uid = normalizeUid(headers['x-userid']);

    // 网关鉴权通过：authMethod 有值且不是 UNAUTHORIZED，且 uid 形态合法
    if (uid && authMethod && authMethod !== 'UNAUTHORIZED') {
        const authInfo = parseCloudBaseAuth(req);
        // 🚨 authInfo 的主体必须与网关 uid 一致：
        //    x-userid 由网关注入（可信），Authorization 里的 payload 只是解出来的（不可信）。
        //    两者可以来自不同用户 —— 直接混用会出现「uid 是 alice、email 是 bob」。
        const sameSubject = authInfo && pickSubject(authInfo) === uid;
        return {
            uid,
            source: 'gateway',
            authInfo: sameSubject ? authInfo : null,
        };
    }

    return { uid: null, source: null, authInfo: null };
}

/**
 * 获取当前用户 UID（CloudBase Auth）
 * @param {Object} req
 * @returns {string|null}
 */
function getUserId(req) {
    // 中间件已解析并挂载的身份优先，避免重复解析出现口径不一致
    const mounted = normalizeUid(req.user?.uid);
    if (mounted) return mounted;
    return resolveAuthIdentity(req).uid;
}

/**
 * 获取当前用户邮箱（可用于预填 Stripe customer_email）
 * @param {Object} req
 * @returns {string|null}
 */
function getUserEmail(req) {
    // 🚨 未通过网关鉴权的请求不得取邮箱：否则自拼一个格式合法的 Bearer 就能让
    //    payload 里的 email 进入下单参数（身份是不可信的，取值也不该可用）
    if (!getUserId(req)) return null;

    const authInfo = req.cloudbaseAuth || parseCloudBaseAuth(req);
    // 两个候选值都要归一化：非字符串 / 超长 / 格式非法一律返回 null
    return normalizeEmail(authInfo?.email) || normalizeEmail(authInfo?.provider_email) || null;
}

module.exports = {
    parseCloudBaseAuth,
    resolveAuthIdentity,
    getUserId,
    getUserEmail,
    // 导出供测试使用
    isValidAuthPayload,
    normalizeUid,
    normalizeEmail,
    pickSubject,
};

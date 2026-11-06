/**
 * Stripe 控制器
 * 处理路由请求，调用 stripeService，返回统一格式
 */
const StripeService = require('../services/stripeService');
const { stripeConfig } = require('../config/config');
const { toMinorUnits, isZeroDecimal } = require('../utils/currency');
const {
    MAX_PRODUCT_NAME_LEN,
    MAX_AMOUNT_MINOR,
    MAX_QUANTITY,
    ALLOWED_MODES,
    validateLineItems,
} = require('../utils/lineItems');
const { resolveAuthIdentity, getUserId, getUserEmail } = require('../utils/cloudbaseAuth');
const stripeService = new StripeService();

// ========== 统一响应格式 ==========

function success(res, data) {
    res.status(200).json({ code: 0, msg: 'success', data });
}

function fail(res, msg, statusCode = 400) {
    res.status(statusCode).json({ code: -1, msg, data: null });
}

// ========== 正向下单 ==========

/**
 * 允许透传给 Stripe 的字段白名单
 *
 * 🚨 不能 `{ ...req.body }` 整体透传：service 的 `...rest` 会把未识别字段原样并入
 *    Stripe create 请求，调用方就能注入模板未预期的参数（payment_method_types、
 *    customer、订阅相关开关等），绕过模板对 mode / success_url 的约束。
 */
const SESSION_PARAM_WHITELIST = [
    // amount = 最小货币单位整数（对齐 Stripe API）；amount_major = 主单位的兼容入口
    'amount', 'amount_major', 'currency', 'productName', 'quantity', 'line_items',
    'mode', 'success_url', 'cancel_url', 'client_reference_id',
    'customer_email', 'metadata',
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * 只保留白名单字段
 * @param {*} body 请求体（非对象视为空）
 * @returns {Object}
 */
function pickSessionParams(body) {
    const source = isPlainObject(body) ? body : {};
    const picked = {};
    for (const key of SESSION_PARAM_WHITELIST) {
        if (source[key] !== undefined) picked[key] = source[key];
    }
    return picked;
}

// ========== 白名单字段的取值校验 ==========

const CLIENT_REF_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** Stripe Checkout Session ID 形态：cs_ 前缀 + 字母数字下划线 */
const SESSION_ID_RE = /^cs_[A-Za-z0-9_]{8,200}$/;
/** Stripe 退款 reason 白名单（SDK 只接受这三个值） */
const ALLOWED_REFUND_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'];
/** 幂等键形态：与 Stripe 的限制对齐（≤255），这里收紧到 8-64 位安全字符 */
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
const CURRENCY_RE = /^[A-Za-z]{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 与 utils/cloudbaseAuth.normalizeEmail 同口径：RFC 5321 长度上限
const MAX_EMAIL_LEN = 254;
const RETURN_URL_KEYS = ['success_url', 'cancel_url'];
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_VALUE_LEN = 500;

/**
 * 只接受「十进制数字字面量」的输入
 *
 * 🚨 不能先 `Number(x)` 再判断：Number(true)===1、Number([5])===5、Number('')===0，
 *    于是 `amount: true` / `amount: [5]` 都会被静默当成合法金额，
 *    调用方的传参错误被吞掉，金额来源脱离业务侧计算。
 *
 * 🚨 字符串分支也不能只判「trim 后非空」：Number('0x10')===16、Number('1e3')===1000，
 *    十六进制 / 科学计数法会被静默放大成完全不同的金额，属可造成资损的取值缺口。
 *    这里用白名单只放行纯十进制，且最多两位小数 —— 超两位小数交给
 *    toMinorUnits 的 Math.round 会被静默截断（1.005 usd 只收 1.00），必须显式拒绝。
 *
 * @param {*} v
 * @returns {boolean}
 */
const DECIMAL_AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
const isNumberLike = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) && DECIMAL_AMOUNT_RE.test(String(v));
    if (typeof v === 'string') return DECIMAL_AMOUNT_RE.test(v.trim());
    return false;
};

/**
 * 校验白名单内每个字段的取值
 *
 * 🚨 只做「字段名」白名单是不够的：白名单挡得住字段名，挡不住恶意取值。
 *    - client_reference_id 是回调反查订单的键，必须限制格式，否则调用方可以
 *      自造订单号，把别人的订单 / 对账数据指向自己
 *    - success_url / cancel_url 是支付完成后的 302 跳转目标，不校验就是开放重定向
 *    - amount / quantity 非法值会直接变成 Stripe 侧的负金额 / NaN
 *
 * @param {Object} params - pickSessionParams 的结果
 * @returns {string|null} 错误信息；null = 校验通过
 */
function validateSessionParams(params) {
    // 金额口径（对齐 Stripe API 与需求 4.4）：amount = 最小货币单位整数（9.90 美元传 990）。
    // 🚨 曾把 amount 当主单位再 ×100：调用方按需求传 990 会被算成 $990，金额放大 100 倍。
    if (params.amount !== undefined && params.amount_major !== undefined) {
        return 'amount（最小货币单位）与 amount_major（主单位）只能传一个，避免金额口径混淆';
    }

    if (params.amount !== undefined) {
        if (!isNumberLike(params.amount)) {
            return 'amount 必须是最小货币单位的正整数（如 9.90 美元传 990），不接受布尔 / 数组 / 对象 / 十六进制 / 科学计数法';
        }
        const n = Number(params.amount);
        if (!Number.isInteger(n) || n <= 0) {
            return 'amount 必须是最小货币单位的正整数（如 9.90 美元传 990）；主单位请改用 amount_major';
        }
        if (n > MAX_AMOUNT_MINOR) {
            return `amount 不能超过 ${MAX_AMOUNT_MINOR}（最小货币单位），过大的整数会丢精度`;
        }
    }

    // 兼容旧口径：amount_major 是主单位，服务端换算成最小货币单位
    if (params.amount_major !== undefined) {
        if (!isNumberLike(params.amount_major)) {
            return 'amount_major 必须是大于 0 的十进制数字（主单位，最多两位小数，如 9.9），不接受布尔 / 数组 / 对象 / 十六进制 / 科学计数法';
        }
        const n = Number(params.amount_major);
        if (!Number.isFinite(n) || n <= 0) {
            return 'amount_major 必须是大于 0 的数字（主单位，如 9.9）';
        }
        // 零小数币种不接受小数：0.5 jpy 会被 Math.round 静默取整成 1，金额被悄悄改写
        if (isZeroDecimal(params.currency) && !Number.isInteger(n)) {
            return 'amount_major 在零小数币种（如 JPY）下必须是整数';
        }
        // 换算成最小货币单位后仍必须是正整数：过小金额（0.001 usd → 0）会变成 0 元订单
        const unitAmount = toMinorUnits(n, params.currency);
        if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
            return 'amount_major 换算成最小货币单位后必须是正整数（金额过小或币种小数位不合法）';
        }
        if (unitAmount > MAX_AMOUNT_MINOR) {
            return `amount_major 换算后不能超过 ${MAX_AMOUNT_MINOR}（最小货币单位）`;
        }
    }

    // 🚨 不能先 String(x) 再匹配：String(['usd']) === 'usd'，数组 / 对象会被隐式转成合法币种
    if (params.currency !== undefined
        && (typeof params.currency !== 'string' || !CURRENCY_RE.test(params.currency))) {
        return 'currency 必须是 3 位字母币种代码（如 usd）';
    }

    if (params.quantity !== undefined) {
        // 与 validateLineItem 同口径：必须是 number 正整数。
        // 曾在这里用 isNumberLike 放行字符串 '3'，下游 _buildSessionParams 又原样透传，
        // 于是 line_items[0].quantity === '3' 被 Stripe 判 400，调用方拿不到明确的参数提示。
        if (typeof params.quantity !== 'number'
            || !Number.isInteger(params.quantity)
            || params.quantity <= 0) {
            return 'quantity 必须是正整数（number 类型），不接受字符串 / 布尔 / 数组 / 对象';
        }
        if (params.quantity > MAX_QUANTITY) {
            return `quantity 不能超过 ${MAX_QUANTITY}`;
        }
    }

    // 与 validateLineItem 的 product_data.name 同口径：非空 + 非纯空格 + 长度上限。
    // 只判 typeof + 长度会放行 '' / '   '，下游构造出商品名为空的 order line。
    if (params.productName !== undefined
        && (typeof params.productName !== 'string'
            || params.productName.trim() === ''
            || params.productName.length > MAX_PRODUCT_NAME_LEN)) {
        return `productName 必须是 1-${MAX_PRODUCT_NAME_LEN} 字符的非空字符串`;
    }

    // 回调按 client_reference_id 反查订单：格式收紧，避免注入任意反查键。
    // 🚨 不能先 String(x) 再匹配：String(['ORDER_1']) === 'ORDER_1'、String(12345) === '12345'，
    //    数组 / 数字被隐式转成合法反查键，放行后原样透传给 Stripe 导致 400。
    if (params.client_reference_id !== undefined
        && (typeof params.client_reference_id !== 'string'
            || !CLIENT_REF_RE.test(params.client_reference_id))) {
        return 'client_reference_id 只允许 1-64 位字母、数字、下划线、连字符';
    }

    // 🚨 不能先 String(x) 再匹配：String(['a@b.co']) === 'a@b.co'，
    //    数组 / 自定义 toString 的对象会被隐式转成合法邮箱，放行后原样透传给 Stripe 导致 400
    // 与登录态回填路径（normalizeEmail：trim + 格式 + 254 长度）保持同一口径，
    // 否则同一字段在「客户端传入」和「回填」两条路径上标准不同
    if (params.customer_email !== undefined
        && (typeof params.customer_email !== 'string'
            || params.customer_email.length > MAX_EMAIL_LEN
            || !EMAIL_RE.test(params.customer_email))) {
        return `customer_email 格式不合法（或超过 ${MAX_EMAIL_LEN} 字符）`;
    }

    if (params.mode !== undefined && !ALLOWED_MODES.includes(params.mode)) {
        return `mode 只支持 ${ALLOWED_MODES.join(' / ')}`;
    }

    // setup 只收集支付方式、不产生扣款：Stripe 不接受金额与 line_items。
    // 在入口就给出明确提示，而不是让请求走到 service 才抛错。
    // 🚨 与下面 line_items 分支的互斥保持同一口径：currency / quantity 也要互斥。
    //    service 的 _buildSessionParams 会把两者解构掉并令 items = null，
    //    body 既不含币种也不含数量 —— 声明值被静默丢弃，接口却仍返回 200。
    if (params.mode === 'setup'
        && (params.amount !== undefined
            || params.amount_major !== undefined
            || params.line_items !== undefined
            || params.currency !== undefined
            || params.quantity !== undefined)) {
        return 'mode=setup 不能传 amount / amount_major / line_items / currency / quantity（setup 只收集支付方式，不扣款）';
    }

    // 🚨 line_items 与顶层金额 / 数量口径互斥：service 的
    //    `let items = lineItems; if (!items) {...}` 在 line_items 存在时会跳过
    //    整个金额构造分支，调用方声明的 amount / quantity 被静默丢弃，实际扣款
    //    取自 line_items —— 声明金额与实收金额不一致且接口仍返回 200。
    //    与上面的 amount / amount_major 互斥保持同一口径，不依赖下游静默忽略。
    if (params.line_items !== undefined
        && (params.amount !== undefined
            || params.amount_major !== undefined
            || params.quantity !== undefined
            // currency 也要互斥：line_items 路径的币种取自每项 price_data.currency，
            // 顶层 currency 会被静默丢弃 —— 声明 eur 实收 usd，接口还返回 200
            || params.currency !== undefined)) {
        return 'line_items 与 amount / amount_major / quantity / currency 只能二选一，避免口径混淆（line_items 的币种写在 price_data.currency）';
    }

    if (params.line_items !== undefined) {
        // ⚠️ 校验函数只读，不在这里改写 params：
        //    就地 sanitize 会让「校验层静默改写业务参数」，description / recurring 等
        //    合法字段被悄悄剥离，接口 200 但下发给 Stripe 的参数已不是调用方给的。
        //    净化统一在 service 真正组装请求时执行（utils/lineItems.sanitizeLineItems）。
        const itemError = validateLineItems(params.line_items, { mode: params.mode });
        if (itemError) return itemError;
    }

    const allowedHosts = Array.isArray(stripeConfig.allowedReturnHosts) ? stripeConfig.allowedReturnHosts : [];
    for (const key of RETURN_URL_KEYS) {
        const value = params[key];
        if (value === undefined || value === '') continue;
        if (typeof value !== 'string') return `${key} 必须是字符串`;

        let url;
        try {
            url = new URL(value);
        } catch {
            return `${key} 不是合法 URL`;
        }
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return `${key} 只允许 http / https 地址`;
        }
        // 域名白名单是**可选**能力：不配 = 只校验协议，回跳地址以调用方传入为准
        // （本模板定位是「开放给接入方自行使用」，回跳页由接入方决定）。
        // 需要收敛开放重定向面时，配 stripeAllowedReturnDomains 即可强制命中白名单。
        if (allowedHosts.length > 0 && !allowedHosts.includes(url.hostname.toLowerCase())) {
            return `${key} 域名 ${url.hostname} 不在白名单（stripeAllowedReturnDomains）内`;
        }
    }

    if (params.metadata !== undefined) {
        // 字符串 / 数组展开会产生数字键，写进 Stripe 后结构异常，
        // 直接影响回调按 client_reference_id / metadata 反查订单
        if (!isPlainObject(params.metadata)) {
            return 'metadata 必须是对象';
        }
        const keys = Object.keys(params.metadata);
        if (keys.length > MAX_METADATA_KEYS) {
            return `metadata 最多 ${MAX_METADATA_KEYS} 个键`;
        }
        if (keys.some(k => typeof params.metadata[k] !== 'string' && typeof params.metadata[k] !== 'number')) {
            return 'metadata 的值只支持字符串 / 数字（Stripe 限制）';
        }
        // Stripe 对每个 metadata value 有 500 字符上限，超了会在 Stripe 侧 400，
        // 调用方只拿到上游原始报错 —— 必须在校验层挡住
        if (keys.some(k => String(params.metadata[k]).length > MAX_METADATA_VALUE_LEN)) {
            return `metadata 的值不能超过 ${MAX_METADATA_VALUE_LEN} 字符（Stripe 限制）`;
        }
    }

    return null;
}

/**
 * 创建 Checkout Session
 * 前端拿到 data.url 后 window.location.href = url 跳转收银台
 */
exports.createSession = async (req, res) => {
    try {
        const params = pickSessionParams(req.body);

        // 🚨 字段白名单只挡字段名，挡不住恶意取值：这里逐个校验取值，不合法直接 400
        //
        // ⚠️ 不能「先清洗后校验」：曾在这里把非对象的 metadata 静默重置为 {}，
        //    于是 validateSessionParams 里的对象守卫永远走不到（死代码），
        //    非法输入被降级成一行 warn 后照常 200 —— 调用方传错参数拿不到反馈，
        //    原本要写的业务 metadata（如 orderId）还被整体丢掉。
        // 先归一化 + 补齐，再统一校验：
        // 邮箱 trim、登录态回填、cloudbaseUid 注入都必须在 validateSessionParams 之前完成，
        // 否则「校验通过」不代表真正下发给 Stripe 的值合规（回填值跳过了校验）。
        if (typeof params.customer_email === 'string') {
            params.customer_email = params.customer_email.trim();
        }
        if (!params.customer_email) {
            const email = getUserEmail(req);
            if (email) params.customer_email = email;
        }

        // 登录态 uid 始终写入 metadata：
        // 调用方显式传 client_reference_id 时也要保留归属 —— 只在不传时才写，
        // 会让调用方用一个自造订单号把「订单归属」完全拿走，回调侧无法回到用户维度。
        // ⚠️ 只在 metadata 是对象（或未传）时合并：非对象必须留给校验层报错，
        //    不能在这里被静默修复成 { cloudbaseUid } 后照常 200。
        const uid = getUserId(req);
        if (uid && (params.metadata === undefined || isPlainObject(params.metadata))) {
            params.metadata = { ...(params.metadata || {}), cloudbaseUid: uid };
        }

        const invalid = validateSessionParams(params);
        if (invalid) {
            console.warn('[Controller] createSession 入参校验失败:', invalid);
            return fail(res, invalid);
        }

        // 🚨 client_reference_id 必填：它是回调反查订单的唯一键。
        //    下单时没传，Stripe 真实事件里也不会有，handleWebhook 的
        //    _isValidBizObject 会把 checkout.session.* 判成「缺业务主键」拒收 ——
        //    表现为「下单成功、回调永远到不了、订单停在未支付」，只能翻日志才发现。
        if (params.client_reference_id === undefined) {
            console.warn('[Controller] createSession 缺少 client_reference_id');
            return fail(res, '缺少 client_reference_id：回调按它反查订单，必填（如 ORDER_123）');
        }

        const result = await stripeService.createSession(params);
        success(res, result);
    } catch (err) {
        // 对外只给固定文案：Stripe 原始错误会带账户状态 / API 版本 / 参数细节，
        // 完整信息只写服务端日志（日志里的 requestId 可用于对齐）。
        // 本地参数校验类错误（非 Stripe SDK 抛出）仍然透传，否则调用方拿不到可用提示。
        console.error('[Controller] createSession error:', err);
        const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
        fail(res, isStripeError ? '创建 Session 失败，请稍后重试' : (err.message || '创建 Session 失败'));
    }
};

/**
 * 查询 Session 状态
 */
exports.retrieveSession = async (req, res) => {
    try {
        const sessionId = req.body?.session_id || req.body?.sessionId || req.query?.session_id;
        if (!sessionId) return fail(res, '缺少 session_id');
        // 形态白名单：避免把任意字符串直接当路径参数打给 Stripe API
        if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
            return fail(res, 'session_id 格式不合法（应为 cs_ 开头的 Stripe Session ID）');
        }

        const result = await stripeService.retrieveSession(sessionId);

        // 🚨 资源级鉴权：session_id 会出现在回跳地址、浏览器历史、Referer、工单与日志里，
        //    只判「已登录」等于允许任何登录用户拿别人的 id 查支付结果与订单号。
        //    归属以服务端下单时写入的 metadata.cloudbaseUid 为准（客户端改不了）。
        //    不一致统一返回 404，避免把接口当成 session_id 存在性探测通道。
        const uid = getUserId(req);
        const owner = result.raw?.metadata?.cloudbaseUid;
        if (!uid || owner !== uid) {
            console.warn('[Controller] retrieveSession 拒绝：Session 归属不匹配', sessionId);
            return fail(res, '未找到该 Session', 404);
        }

        // 不回传 raw：只需要业务字段，整包 raw 会把 Stripe 全部客户/支付信息带给前端
        const { raw, ...business } = result;
        success(res, business);
    } catch (err) {
        console.error('[Controller] retrieveSession error:', err);
        const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
        fail(res, isStripeError ? '查询 Session 失败，请稍后重试' : (err.message || '查询 Session 失败'));
    }
};

/**
 * 发起退款
 *
 * 只支持按 session_id 退款：Session 上带着服务端写入的 metadata.cloudbaseUid，
 * 是唯一能证明「这单属于当前用户」的凭据。直接按 payment_intent / charge 退，
 * 就没有归属校验的锚点，等于允许任何登录用户退别人的单。
 */
exports.createRefund = async (req, res) => {
    try {
        const uid = getUserId(req);
        // payMiddleware 已挡住未登录；匿名联调开关下 uid=null，退款仍必须 fail closed
        if (!uid) return fail(res, '未登录，无法发起退款', 401);

        const body = isPlainObject(req.body) ? req.body : {};

        const sessionId = body.session_id || body.sessionId;
        if (!sessionId) return fail(res, '缺少 session_id');
        if (typeof sessionId !== 'string' || !SESSION_ID_RE.test(sessionId)) {
            return fail(res, 'session_id 格式不合法（应为 cs_ 开头的 Stripe Session ID）');
        }

        // 不传 = 全额；传了必须是 number 正整数（与 amount 口径一致，不接受字符串 / 布尔 / 数组）
        const amount = body.amount;
        if (amount !== undefined
            && (typeof amount !== 'number'
                || !Number.isInteger(amount)
                || amount <= 0
                || amount > MAX_AMOUNT_MINOR)) {
            return fail(res, `amount 必须是正整数（最小货币单位，如 990），且不超过 ${MAX_AMOUNT_MINOR}`);
        }

        const reason = body.reason;
        if (reason !== undefined && !ALLOWED_REFUND_REASONS.includes(reason)) {
            return fail(res, `reason 只支持 ${ALLOWED_REFUND_REASONS.join(' / ')}`);
        }

        // 幂等键由调用方给（如同一订单号），重试时 Stripe 返回同一笔退款
        const idempotencyKey = body.idempotency_key;
        if (idempotencyKey !== undefined
            && (typeof idempotencyKey !== 'string' || !IDEMPOTENCY_KEY_RE.test(idempotencyKey))) {
            return fail(res, 'idempotency_key 必须是 8-64 位字母、数字、下划线或连字符');
        }

        const result = await stripeService.createRefund({
            sessionId,
            amount,
            reason,
            idempotencyKey,
            // 归属只取网关注入的身份，绝不接受请求体里的 uid
            ownerUid: uid,
        });
        success(res, result);
    } catch (err) {
        console.error('[Controller] createRefund error:', err);
        // Stripe 原始错误会带账户 / 参数细节，对外只给固定文案
        const isStripeError = typeof err?.type === 'string' && err.type.startsWith('Stripe');
        if (isStripeError) return fail(res, '退款失败，请稍后重试');
        fail(res, err.message || '退款失败', err.status || 400);
    }
};

// ========== 异步回调 ==========

/**
 * Stripe Webhook 回调（无鉴权，由签名保证可信）
 *
 * ⚠️ 与微信支付的关键差异：
 * - 微信：支付/退款/转账三条独立回调路由
 * - Stripe：所有事件走同一条路由，按 event.type 内部分发
 *
 * ⚠️ 必须先返回 2xx 再做业务：非 2xx 会触发 Stripe 重试（live 模式最长 3 天指数退避）
 *    耗时业务逻辑请改为异步（消息队列 / 延迟处理）后再落库
 */
exports.webhook = async (req, res) => {
    try {
        // 回调日志脱敏：只打印事件类型与顶层键名，不打印签名与完整报文
        console.log('[Controller] webhook 回调:', {
            has_signature: !!req.headers['stripe-signature'],
            event_type: req.body?.type || req.body?.ParsedNotify?.event_type,
            has_raw_body: !!req.rawBody,
            // 联调用：确认集成中心转发的明文字段名（ParsedContent / ParsedNotify / 原始事件）
            body_keys: isPlainObject(req.body) ? Object.keys(req.body).slice(0, 20) : typeof req.body,
        });

        const callbackParams = {
            body: req.body,
            // ⚠️ 必须是未经任何修改的原始请求体
            rawBody: req.rawBody,
            signature: req.headers['stripe-signature'],
        };

        const result = await stripeService.handleWebhook(callbackParams);

        // 验签失败 / 缺少 event.type / 明文结构不合法 → 4xx，绝不当作成功事件
        if (!result) {
            return res.status(400).json({ code: 'FAIL', message: '验签失败或事件不可信' });
        }

        // 统一成功应答（Stripe 只认 2xx，内容不关心）
        res.status(200).json({ code: 'SUCCESS', message: '成功' });
    } catch (err) {
        console.error('[Controller] webhook error:', err);
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
    }
};

// ========== 鉴权中间件 ==========

/**
 * 鉴权中间件
 *
 * 可信身份来源只有一个：**网关鉴权后注入的身份头**
 *   - `x-userid`     已认证用户标识
 *   - `x-authmethod` 网关鉴权方式；未通过时为 `UNAUTHORIZED`
 *
 * 🚨 函数侧不再解码 Bearer JWT：拿不到验签公钥（JWKS 接口一律 401），
 *    只 base64 解码 payload 等于假鉴权 —— 伪造 `x.<payload>.y` 就能冒用任意 uid。
 *    2026-11-05 实测：从集成回调入口（身份认证关闭）伪造 x-userid / x-usertype，
 *    会被网关覆盖为 null / NONE / UNAUTHORIZED，因此这两个头必须同时校验。
 *
 * 🚨 曾经放行、现已删除的分支（都是假保护）：
 *   - `x-tcb-integration-id`：自定义 header，`curl -H` 加一行就过
 *   - `x-wx-source`：同样是纯 header 字符串比对，可任意伪造
 *   - `TENCENTCLOUD_RUNENV` / `SCF_RUNTIME`：云函数运行时**恒存在**，该分支永远命中
 *     → 部署后等于鉴权无条件放行，任何人都能用商户 sk 建单
 *   - `x-wx-openid`：只做格式校验，没有任何来源证明
 *
 * 本地联调要放开匿名调用，必须显式设 `ALLOW_ANONYMOUS_DEV=true`（默认关闭），
 * 且每次放行都会打 warn —— 不允许「静默放行」。
 *
 * ⚠️ 回调路由（/stripe/webhook）不挂此中间件，改由签名保证可信。
 */
/**
 * 是否运行在云端运行时（云函数 / 云托管容器）
 *
 * 🚨 ALLOW_ANONYMOUS_DEV 只允许本地开发使用：靠 README 写「生产不要开」不是防护，
 *    配置写错带到线上就会放行未登录调用。云端一律直接忽略该开关。
 */
const isCloudRuntime = () => Boolean(
    process.env.TENCENTCLOUD_RUNENV
    || process.env.SCF_RUNTIME
    || process.env.CFC_RUNTIME
    || process.env.KUBERNETES_SERVICE_HOST
);

exports.payMiddleware = (req, res, next) => {
    const identity = resolveAuthIdentity(req);

    if (identity.uid) {
        req.user = {
            uid: identity.uid,
            source: identity.source,
        };
        if (identity.authInfo) req.cloudbaseAuth = identity.authInfo;
        return next();
    }

    // 显式本地联调开关：默认关闭，且云端运行时直接忽略
    const allowAnonymousDev = (process.env.ALLOW_ANONYMOUS_DEV || '').trim().toLowerCase() === 'true';
    if (allowAnonymousDev && isCloudRuntime()) {
        console.warn('[鉴权] ALLOW_ANONYMOUS_DEV=true 在云端运行时被忽略（该开关仅本地开发有效）');
    }
    if (allowAnonymousDev && !isCloudRuntime()) {
        console.warn('[鉴权] ⚠️ ALLOW_ANONYMOUS_DEV=true，放行未登录请求（仅限本地，生产严禁开启）');
        req.user = { uid: null, source: 'anonymous-dev' };
        return next();
    }

    // 「带了凭证但网关没认」≠「完全没凭证」：分开返回，排障时不必猜
    const hasBearer = (req.headers.authorization || '').startsWith('Bearer ');
    if (hasBearer) {
        console.warn('[鉴权] 拒绝：Bearer 凭证无效或已过期', req.method, req.path);
        return res.status(401).json({ code: -1, msg: '登录态无效或已过期，请重新登录后再试' });
    }

    console.warn('[鉴权] 拒绝未认证调用:', req.method, req.path,
        '（业务接口必须经网关鉴权入口：HTTP API 带 AccessToken，或开启身份认证的自定义域名路由）');
    return res.status(401).json({
        code: -1,
        msg: '未授权访问：请经网关鉴权入口调用（HTTP API 带 AccessToken，或开启身份认证的自定义域名路由）',
    });
};

// 供单测直接验证入参白名单（避免必须起 HTTP）
exports.pickSessionParams = pickSessionParams;
exports.validateSessionParams = validateSessionParams;
exports.SESSION_PARAM_WHITELIST = SESSION_PARAM_WHITELIST;

module.exports = exports;

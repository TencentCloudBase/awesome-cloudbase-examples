/**
 * Stripe 控制器
 * 处理路由请求，调用 stripeService，返回统一格式
 */
const StripeService = require('../services/stripeService');
const { parseCloudBaseAuth, getUserId, getUserEmail } = require('../utils/cloudbaseAuth');
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
 * 创建 Checkout Session
 * 前端拿到 data.url 后 window.location.href = url 跳转收银台
 */
exports.createSession = async (req, res) => {
    try {
        const params = { ...req.body };

        // 未传邮箱时，尝试从登录态补齐（便于 Stripe 预填、后续对账）
        if (!params.customer_email) {
            const email = getUserEmail(req);
            if (email) params.customer_email = email;
        }

        // 未传业务订单号时，用登录态 uid 兜底生成，保证回调能反查
        if (!params.client_reference_id) {
            const uid = getUserId(req);
            if (uid) params.metadata = { ...params.metadata, cloudbaseUid: uid };
        }

        const result = await stripeService.createSession(params);
        success(res, result);
    } catch (err) {
        console.error('[Controller] createSession error:', err);
        fail(res, err.message || '创建 Session 失败');
    }
};

/**
 * 查询 Session 状态
 */
exports.retrieveSession = async (req, res) => {
    try {
        const sessionId = req.body?.session_id || req.body?.sessionId || req.query?.session_id;
        if (!sessionId) return fail(res, '缺少 session_id');

        const result = await stripeService.retrieveSession(sessionId);
        success(res, result);
    } catch (err) {
        console.error('[Controller] retrieveSession error:', err);
        fail(res, err.message || '查询 Session 失败');
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
        // 回调日志脱敏：只打印事件类型，不打印签名与完整报文
        console.log('[Controller] webhook 回调:', {
            has_signature: !!req.headers['stripe-signature'],
            event_type: req.body?.type || req.body?.ParsedNotify?.event_type,
            has_raw_body: !!req.rawBody,
        });

        const callbackParams = {
            body: req.body,
            // ⚠️ 必须是未经任何修改的原始请求体
            rawBody: req.rawBody,
            signature: req.headers['stripe-signature'],
        };

        const result = await stripeService.handleWebhook(callbackParams);

        if (!result) {
            return res.status(400).json({ code: 'FAIL', message: '验签失败' });
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
 * 兼容多种部署方式：云 API 网关、集成中心网关、HTTP 云函数、云托管、本地开发
 *
 * ⚠️ 回调路由（/stripe/webhook）不挂此中间件，改由签名保证可信
 */
exports.payMiddleware = (req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.warn('[鉴权] 开发环境 — 鉴权仍然生效，如需测试请携带有效 header');
    }

    // 云 API 网关模式：Bearer token（CloudBase Auth accessToken）
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        if (parseCloudBaseAuth(req)) {
            req.cloudbaseAuth = parseCloudBaseAuth(req);
            return next();
        }
    }

    // 集成中心网关模式（网关会剥离客户端传入的该 header，仅网关自身注入）
    if (req.headers['x-tcb-integration-id']) {
        return next();
    }

    // 云托管模式（callContainer）
    const authMethod = req.headers['x-authmethod'] || req.headers['X-Authmethod'];
    const wxSource = req.headers['x-wx-source'];
    if (wxSource === 'wx_devtools' || wxSource === 'wx_client' || authMethod === 'WX_SERVER_AUTH') {
        return next();
    }

    // HTTP 云函数模式（环境变量仅存在于 SCF 运行时，外部无法伪造）
    if (process.env.TENCENTCLOUD_RUNENV || process.env.SCF_RUNTIME) {
        return next();
    }

    res.status(401).json({ code: -1, msg: '未授权访问' });
};

module.exports = exports;

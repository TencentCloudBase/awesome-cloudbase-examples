/**
 * 回调入口统一守卫
 *
 * Stripe 回调有三条可达路径：
 *   1. POST /notify        —— 云 API 适配层分发到 stripeRouter
 *   2. POST /notify        —— 根路径兜底挂载（集成中心模板回调 URL）
 *   3. POST /stripe/notify —— 直连 router
 *
 * 只有根路径兜底那条曾单独挂守卫，另外两条会绕过事件类型形态校验与路由字段剥离。
 * 这里把守卫下沉到 controller 入口，三条路径共用同一套口径，避免校验漂移。
 */

// Stripe 事件类型的实际形态：<object>.<action>[.<sub>]，各段只含小写字母 / 数字 / 下划线
// （如 checkout.session.completed、payment_intent.created、invoice.paid）
const EVENT_TYPE_RE = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;
/** 事件类型长度上限：Stripe 最长的已知类型也远小于此，超出即视为畸形输入 */
const MAX_EVENT_TYPE_LEN = 128;

/**
 * 从请求体提取事件类型（|| 短路，取第一个真值）。
 * 三个来源与云 API 适配层保持完全一致的口径。
 */
function extractEventType(body) {
    return body?.type
        || body?.ParsedNotify?.event_type
        || body?.rawData?.event_type;
}

/**
 * 事件类型形态校验的唯一口径。
 * 非字符串 / 不含点号 / 含非法字符 / 超长一律判非法（EVENT_TYPE_RE 已要求至少一个点号）。
 * @returns {string|null} 错误文案；null = 形态合法
 */
function validateEventTypeShape(eventType) {
    if (typeof eventType !== 'string'
        || eventType.length > MAX_EVENT_TYPE_LEN
        || !EVENT_TYPE_RE.test(eventType)) {
        return '事件类型格式非法';
    }
    return null;
}

/** 剥离云 API / 网关注入的路由控制字段，绝不让它们透传给 handleWebhook */
function stripRoutingFields(req) {
    if (req.body && typeof req.body === 'object') {
        delete req.body._action;
        delete req.body.path;
        delete req.body.method;
    }
}

/**
 * 回调入口守卫：任何抵达 controller 的回调请求都必须先过形态校验与字段剥离。
 * @returns {boolean} true = 已应答 400，调用方应立即 return
 */
function guardWebhookRequest(req, res) {
    stripRoutingFields(req);
    const eventType = extractEventType(req.body);
    const shapeError = validateEventTypeShape(eventType);
    if (shapeError) {
        // 🚨 不回显原始输入：入口全域可达，回显等于开放反射面
        console.warn('[Stripe] 事件类型形态非法，拒绝路由到 webhook:',
            String(eventType).slice(0, 64));
        res.status(400).json({ code: -1, msg: shapeError });
        return true;
    }
    return false;
}

module.exports = {
    EVENT_TYPE_RE,
    MAX_EVENT_TYPE_LEN,
    extractEventType,
    validateEventTypeShape,
    stripRoutingFields,
    guardWebhookRequest,
};

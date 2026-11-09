const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const { validateConfig } = require('./config/config');

const app = express();

// 启动时校验配置（只告警不阻断）
validateConfig();

// CORS：默认不开放跨域
// 前端与本服务不同源时，设置环境变量 corsAllowOrigin，多个域名用逗号分隔
app.use((req, res, next) => {
    const allowedOrigins = process.env.corsAllowOrigin
        ? process.env.corsAllowOrigin.split(',').map(s => s.trim())
        : [];
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }
    }
    next();
});

app.use(logger('dev'));

// ⚠️⚠️ 关键：保存原始请求体，供 Stripe 回调验签使用
//
// Stripe 签名是基于「原始 body 字节」计算的，任何 JSON.parse → stringify 都会
// 改变字节导致验签失败。这里通过 verify 钩子在解析前把原始字符串留存到 req.rawBody，
// webhook 路由验签时直接用 req.rawBody，不重新序列化 req.body。
//
// 若改为官方推荐的 express.raw()，则必须注册在 express.json() 之前，否则同样失效。
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    },
}));
app.use(express.urlencoded({ extended: false }));

// Stripe 路由（HTTP 访问服务方式，路径完整）
const stripeRouter = require('./routes/stripe');
app.use('/stripe', stripeRouter);

// ========== 云 API 网关适配 ==========
// 云 API 调用 HTTP 云函数时，Express 收到的 path 为 /，业务路由通过 body._action 传递
// 参考：https://docs.cloudbase.net/cloud-function/function-calls/
const ALLOWED_ACTIONS = new Set([
    'stripe_create_session', 'stripe_retrieve_session', 'stripe_create_refund',
    // notify = 集成中心模板回调 path
    'stripe_notify',
]);

/**
 * Stripe 事件类型的基本形态校验（不是「已订阅」白名单）
 *
 * 🚨 只判「是不是含点号的字符串」不够：body 里塞一个 {"type":"x.y"} 就能顶着
 *    回调通道的身份进入「无鉴权、靠签名保证可信」的路径，
 *    等于把 ALLOWED_ACTIONS 的白名单完全旁路。
 *
 * ⚠️ 但这里**不能**用 EVENT_SEMANTICS 的键做准入白名单：那份语义表只描述
 *    「本模板关心哪 6 个事件」，而 endpoint 实际订阅哪些事件是在 Stripe 后台
 *    独立配置的。拿语义表当路由白名单，会把 Stripe 合法投递的未订阅事件
 *    （payment_intent.created / invoice.paid …）打成 400，Stripe 按指数退避
 *    重试最长 3 天，甚至停用整个 endpoint，已订阅事件也一起中断。
 *
 * 因此路由层只做「形态合法性」校验，把「是否订阅」的语义判断交回
 * stripeService.handleWebhook —— 未订阅事件返回 { ignored: true }，控制器回 200，
 * Stripe 正常停止重试。真正的可信性由签名 / 网关来源证明保证（见 stripeService）。
 */
// Stripe 事件类型的实际形态：<object>.<action>[.<sub>]，各段只含小写字母 / 数字 / 下划线
// （如 checkout.session.completed、payment_intent.created、invoice.paid）
const EVENT_TYPE_RE = /^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/;
/** 事件类型长度上限：Stripe 最长的已知类型也远小于此，超出即视为畸形输入 */
const MAX_EVENT_TYPE_LEN = 128;

/**
 * 从请求体提取事件类型（与云 API 适配层完全一致的取值口径：|| 短路）。
 * 抽成公共函数供「适配中间件」与「根路径 /notify 兜底入口」复用，避免口径漂移。
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
 * 回调入口守卫：任何抵达控制器的回调请求都必须先过形态校验与字段剥离。
 * 适配中间件未命中 actionName 而走 next() 时，根路径 /notify 兜底挂载复用本守卫，
 * 杜绝「next() 直达控制器」这条绕过路由层早筛的旁路。
 */
function webhookEntryGuard(req, res, next) {
    stripRoutingFields(req);
    const eventType = extractEventType(req.body);
    const shapeError = validateEventTypeShape(eventType);
    if (shapeError) {
        // 🚨 不回显原始输入：入口全域可达，回显等于开放反射面
        console.warn('[Stripe] 事件类型形态非法，拒绝路由到 webhook:',
            String(eventType).slice(0, 64));
        return res.status(400).json({ code: -1, msg: shapeError });
    }
    next();
}

app.use((req, res, next) => {
    // 从 body 中提取路由（三种方式兼容）
    const action = req.body?._action;           // 方式1: { _action: 'stripe_create_session' }
    const bodyPath = req.body?.path;            // 方式2: { path: '/stripe/create_session' }
    // 方式3: Stripe 事件对象自带 type（如 checkout.session.completed）
    //        集成中心转发时也可能放在 ParsedNotify.event_type / rawData.event_type
    const eventType = extractEventType(req.body);

    // 🚨 路由控制字段只用于分发，绝不透传给 stripeService.handleWebhook：
    //    它们是云 API / 网关注入的元数据，混进回调报文会被当成业务内容解析。
    //    统一在入口剥离（而不是只在某些分支删）：`_action` 与 `path` 共存、
    //    或 `path` 不含 /stripe/ 时，按分支删会漏掉并原样进入 handleWebhook。
    //    验签用 req.rawBody 原始字节，剥离 req.body 不影响签名校验。
    stripRoutingFields(req);

    let actionName = null;

    if (action) {
        const raw = action.includes('/stripe/') ? action.split('/stripe/').pop() : action;
        // 兼容两种写法：`create_refund`（前端/README 约定）与 `stripe_create_refund`
        // （历史注释示例）。下面统一拼 `stripe_` 前缀查白名单，不先剥掉会拼成
        // `stripe_stripe_create_refund` → 400。
        actionName = raw.startsWith('stripe_') ? raw.slice('stripe_'.length) : raw;
    } else if (bodyPath && bodyPath.includes('/stripe/')) {
        actionName = bodyPath.split('/stripe/').pop();
    } else if (eventType !== undefined) {
        // 🚨 携带了事件类型字段就必须过形态校验：非字符串 / 不含点号 / 超长 /
        //    正则不通过一律 400 早筛，绝不落到 next() 兜底直达控制器 —— 那条路径
        //    既绕过 EVENT_TYPE_RE / MAX_EVENT_TYPE_LEN，也不会被守卫复用前的旧逻辑拦住。
        //    形态合法但未订阅 ≠ 攻击，交给 handleWebhook 优雅忽略（回 200，避免 Stripe 重试）。
        const shapeError = validateEventTypeShape(eventType);
        if (shapeError) {
            // 🚨 不回显原始输入：该分支在鉴权之前、全域可达，回显等于开放反射面，
            //    还会让「是否命中」变得可判定。原始值只截断后写服务端日志。
            console.warn('[Stripe] 事件类型形态非法，拒绝路由到 webhook:',
                String(eventType).slice(0, 64));
            return res.status(400).json({ code: -1, msg: shapeError });
        }
        // 集成中心 stripe-pay 模板的回调 path 是 /notify
        actionName = 'notify';
        console.info('[Stripe] 事件路由映射:', eventType, '→ notify');
    }

    if (actionName) {
        if (!ALLOWED_ACTIONS.has('stripe_' + actionName)) {
            // 同样不回显原始输入：actionName 来自请求体，回显会让接口变成输入探针
            console.warn('[云API适配] 拒绝不支持的操作:', String(actionName).slice(0, 64));
            return res.status(400).json({ code: -1, msg: '不支持的操作' });
        }
        console.info('[云API适配] 路由分发:', '/' + actionName);
        req.url = '/' + actionName;
        req.method = 'POST';
        return stripeRouter(req, res, next);
    }

    next();
});

// 集成中心 stripe-pay 模板的回调 path 固定为 `/notify`（无 `/stripe` 前缀），
// 回调域名直连时命中的就是根路径，必须单独挂载；否则 Stripe 后台填的 URL 会 404。
//
// ⚠️ 必须注册在云 API 适配中间件之后：该中间件做事件类型形态校验、剥离
//    _action/path/method 路由控制字段、action 白名单分发。挂在它之前会让
//    根路径请求直接进控制器，绕过路由层早筛。
//    适配层命中 actionName 时自行分发到 stripeRouter（其中含 /notify 路由）；
//    未命中时 next() 落到这里的兜底挂载 —— 兜底同样挂 webhookEntryGuard，
//    复用 EVENT_TYPE_RE / MAX_EVENT_TYPE_LEN 校验与路由字段剥离，
//    不允许任何回调请求绕过适配层的校验口径直达控制器。
const stripeController = require('./controllers/stripeController');
app.post('/notify', webhookEntryGuard, stripeController.webhook);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    const status = err.status || 500;
    res.status(status).json({
        code: -1,
        msg: req.app.get('env') === 'development' ? err.message : '服务内部错误',
    });
});

module.exports = app;

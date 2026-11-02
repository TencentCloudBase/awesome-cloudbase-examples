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
    'stripe_webhook',
]);

app.use((req, res, next) => {
    // 从 body 中提取路由（三种方式兼容）
    const action = req.body?._action;           // 方式1: { _action: 'stripe_create_session' }
    const bodyPath = req.body?.path;            // 方式2: { path: '/stripe/create_session' }
    // 方式3: Stripe 事件对象自带 type（如 checkout.session.completed）
    //        集成中心转发时也可能放在 ParsedNotify.event_type / rawData.event_type
    const eventType = req.body?.type
        || req.body?.ParsedNotify?.event_type
        || req.body?.rawData?.event_type;

    let actionName = null;

    if (action) {
        actionName = action.includes('/stripe/') ? action.split('/stripe/').pop() : action;
        delete req.body._action;
    } else if (bodyPath && bodyPath.includes('/stripe/')) {
        actionName = bodyPath.split('/stripe/').pop();
        delete req.body.path;
        delete req.body.method;
    } else if (eventType && typeof eventType === 'string' && eventType.includes('.')) {
        // Stripe 所有事件统一投递到 /webhook，由 stripeService 内部按 event.type 分发
        actionName = 'webhook';
        console.info('[Stripe] 事件路由映射:', eventType, '→ webhook');
    }

    if (actionName) {
        if (!ALLOWED_ACTIONS.has('stripe_' + actionName)) {
            return res.status(400).json({ code: -1, msg: '不支持的操作: ' + actionName });
        }
        console.info('[云API适配] 路由分发:', '/' + actionName);
        req.url = '/' + actionName;
        req.method = 'POST';
        return stripeRouter(req, res, next);
    }

    next();
});

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

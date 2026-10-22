const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const config = require('./config/config');
const { validateConfig, shouldRefuseBoot } = require('./config/config');

const app = express();

// 启动时校验配置
// 两级结果：errors（配置缺失）只告警，模板仍可启动；risky（显式打开的危险开关）见下方判定
const configErrors = validateConfig();

// 🔒 只拦「云上 + PAY_GUARD=off」：那是带病上线的形态，启动失败比日志横幅可靠得多。
//    本地 `npm run dev` 不受影响（不是云环境，直接放行），联调不需要任何额外变量。
if (shouldRefuseBoot()) {
    console.error('[Startup] ⛔ 检测到「云上运行 + PAY_GUARD=off」，已拒绝启动。');
    console.error('[Startup] 本地联调请用 npm run dev；确需云上联调，请额外设置 PAY_ALLOW_INSECURE_BOOT=true');
    process.exit(1);
}

if (configErrors.unsafe) {
    console.error('[Startup] ⚠️ 以不安全模式启动（PAY_GUARD=off），禁止用于生产。');
}

// 证书模式启动时预热：提前拉取平台证书，避免首次回调时证书未就绪导致验签失败
// （主动请求永远走 SDK 自签名，验签方式只看 verifyMode，与回调由谁验签无关）
if (config.verifyMode === 'certificate') {
    const SdkStrategy = require('./services/strategies/sdkStrategy');
    const strategy = new SdkStrategy(config.payConfig);
    // ⚠️ SDK 只导出 get_certificates（下划线），没有 getCertificates；
    //    而且它在缺 publicKey / 参数时可能**同步**抛错 —— 必须用 Promise.resolve().then 包住，
    //    否则异常在进入 Promise 链之前就抛出，.catch 接不到，直接把启动搞挂。
    Promise.resolve()
        .then(() => strategy.wxPay.get_certificates(config.payConfig.mchAPIv3Key))
        .then((certs) => {
            const count = certs ? Object.keys(certs).length : 0;
            console.log(`[Startup] 平台证书预加载成功，共 ${count} 张`);
        })
        .catch((err) => {
            console.warn('[Startup] 平台证书预加载失败（将在首次验签时自动重试）:', err.message);
        });
}



// CORS：默认不开放跨域
// 如果前端与本服务不同源（如 H5 页面直接调用），
// 需设置环境变量 corsAllowOrigin，多个域名用逗号分隔
// 例：corsAllowOrigin=https://a.com,https://b.com
app.use((req, res, next) => {
  const allowedOrigins = process.env.corsAllowOrigin
    ? process.env.corsAllowOrigin.split(',').map(s => s.trim())
    : [];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  }
  next();
});

app.use(logger('dev'));
app.use(express.json({
  verify: (req, res, buf) => {
    // 保存原始请求体，供微信支付回调验签使用
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: false }));

// 支付路由（HTTP 访问服务方式，路径完整）
const payRouter = require('./routes/pay');
app.use('/wx-pay', payRouter);

// 云 API 网关适配
// 云 API 调用 HTTP 云函数时，Express 收到的 path 为 /，业务路由通过 body._action 传递
// 参考：https://docs.cloudbase.net/cloud-function/function-calls/
const ALLOWED_ACTIONS = new Set([
  'wxpay_order', 'wxpay_order_h5', 'wxpay_order_native',
  'wxpay_query_order_by_out_trade_no', 'wxpay_query_order_by_transaction_id',
  'wxpay_close_order',
  'wxpay_refund', 'wxpay_refund_query',
  'wxpay_transfer', 'wxpay_transfer_bill_query', 'wxpay_transfer_bill_query_by_no',
  'wxpay_transfer_batch_query',
  'unifiedOrderTrigger', 'refundTrigger', 'transferTrigger'
]);

// 集成中心系统内置回调的 event_type 映射（body.ParsedNotify.event_type → 内部路由名）
const INTEGRATION_EVENT_MAP = {
  'TRANSACTION.SUCCESS': 'unifiedOrderTrigger',
  'TRANSACTION.FAIL':    'unifiedOrderTrigger',
  'REFUND.SUCCESS':      'refundTrigger',
  'REFUND.ABNORMAL':     'refundTrigger',
  'REFUND.CLOSED':       'refundTrigger',
  'MCHTRANSFER.TRANSFER.SUCCESS': 'transferTrigger',
  'MCHTRANSFER.TRANSFER.FAIL':    'transferTrigger',
};

app.use((req, res, next) => {
  // 从 body 中提取路由（四种方式兼容）
  const action = req.body?._action;       // 方式1: { _action: 'wxpay_order' }
  const bodyPath = req.body?.path;         // 方式2: { path: '/wx-pay/wxpay_order' }
  // 方式3: 集成中心系统内置回调
  //   优先用 rawData.event_type（微信原始字段），fallback 到 ParsedNotify.event_type（集成中心解析字段）
  //   两者值一致，双来源保证兼容性
  const eventType = req.body?.rawData?.event_type
                 || req.body?.ParsedNotify?.event_type;

  let actionName = null;
  if (action) {
    actionName = action.includes('/wx-pay/') ? action.split('/wx-pay/').pop() : action;
    delete req.body._action;
  } else if (bodyPath && bodyPath.includes('/wx-pay/')) {
    actionName = bodyPath.split('/wx-pay/').pop();
    delete req.body.path;
    delete req.body.method;
  } else if (eventType && INTEGRATION_EVENT_MAP[eventType]) {
    // 集成中心系统内置回调：通过 event_type 判断路由
    actionName = INTEGRATION_EVENT_MAP[eventType];
    console.info('[集成中心] event_type 路由映射:', eventType, '→', actionName);
  }

  if (actionName) {
    if (!ALLOWED_ACTIONS.has(actionName)) {
      return res.status(400).json({ code: -1, msg: '不支持的操作: ' + actionName });
    }
    console.info('[云API适配] 路由分发:', '/' + actionName);
    req.url = '/' + actionName;
    req.method = 'POST';
    return payRouter(req, res, next);
  }

  next();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    code: -1,
    msg: req.app.get('env') === 'development' ? err.message : '服务内部错误'
  });
});

module.exports = app;

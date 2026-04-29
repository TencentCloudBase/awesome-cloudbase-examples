const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const config = require('./config/config');
const { validateConfig } = require('./config/config');

const app = express();

// 启动时校验配置
validateConfig();

// 证书模式启动时预热：提前拉取平台证书，避免首次回调时证书未就绪导致验签失败
if (config.signMode === 'sdk' && config.verifyMode === 'certificate') {
    const SdkStrategy = require('./services/strategies/sdkStrategy');
    const strategy = new SdkStrategy(config.payConfig);
    strategy.wxPay.getCertificates?.().then(certs => {
        const count = Array.isArray(certs) ? certs.length : 0;
        console.log(`[Startup] 平台证书预加载成功，共 ${count} 张`);
    }).catch(err => {
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
app.use((req, res, next) => {
  // 从 body 中提取路由路径（三种方式兼容）
  const action = req.body?._action;                    // 方式1: { _action: 'wxpay_order' } 或完整路径
  const bodyPath = req.body?.path;                      // 方式2: 文档标准 { path: '/wx-pay/wxpay_order' }

  let routePath = null;
  let actionName = null;
  if (action) {
    // 兼容两种格式：'wxpay_order' 或 '/wx-pay/wxpay_order'
    actionName = action.includes('/wx-pay/') ? action.split('/wx-pay/').pop() : action;
    delete req.body._action;
  } else if (bodyPath && bodyPath.includes('/wx-pay/')) {
    actionName = bodyPath.split('/wx-pay/').pop();
    delete req.body.path;
    delete req.body.method;
  }

  if (actionName) {
    if (!ALLOWED_ACTIONS.has(actionName)) {
      return res.status(400).json({ code: -1, msg: '不支持的操作: ' + actionName });
    }
    routePath = '/' + actionName;
    console.info('[云API适配] 路由分发:', routePath);
    req.url = routePath;
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

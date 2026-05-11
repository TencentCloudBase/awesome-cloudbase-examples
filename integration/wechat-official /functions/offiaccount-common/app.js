const createError = require('http-errors');
const express = require('express');
const { validateConfig } = require('./config/config');

const app = express();

// 启动时校验配置
validateConfig();

// ─── 中间件 ────────────────────────────────────────────────────────────────

// CORS：通过 corsAllowOrigin 环境变量控制（多个域名用逗号分隔）
// - 走网关路由时：网关自动处理 CORS，此处响应头不冲突
// - 走 HTTP 直连时：由此中间件放行白名单内的 origin
app.use((req, res, next) => {
  const allowedOrigins = process.env.corsAllowOrigin
    ? process.env.corsAllowOrigin.split(',').map(s => s.trim())
    : [];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── 路径重写：剥离 /offiaccount-common 函数名前缀 ─────────────────────────
// CloudBase HTTP 函数调用时，路径可能带有函数名前缀
// 例：/offiaccount-common/oauth/info → /oauth/info
app.use((req, res, next) => {
  const prefix = '/offiaccount-common';
  if (req.path.startsWith(prefix + '/') || req.path === prefix) {
    const newPath = req.path.slice(prefix.length) || '/';
    req.url = newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    console.log('[rewrite]', req.method, req.originalUrl, '->', newPath);
  }
  next();
});

// ─── 路由 ─────────────────────────────────────────────────────────────────
const router = require('./routes/index');
app.use('/', router);

// 健康检查
app.get('/', (req, res) => {
  res.json({
    code: 0,
    msg: 'offiaccount-common ok',
    version: '1.0.0',
    apis: [
      '/oauth/*', '/token/*', '/jssdk/*', '/openapi/*',
      '/subscribe/*', '/kefu/*', '/menu/*', '/message/*',
      '/user/*', '/media/*', '/qrcode/*', '/account/*',
    ],
  });
});

// ─── 错误处理 ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    code: -1,
    msg: req.app.get('env') === 'development' ? err.message : '服务内部错误',
    data: null,
  });
});

module.exports = app;

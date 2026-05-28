/**
 * Express 应用骨架模板
 *
 * 使用说明：
 * 1. 复制此文件到你的云函数目录，改名为 app.js
 * 2. 修改以下占位符：
 *    - {FUNCTION_NAME}     → 函数名称（用于日志前缀）
 *    - {ROUTE_PREFIX}      → 路由前缀（如 '/wx-pay', '/sms'）
 *    - {ROUTER_PATH}       → 路由文件路径（如 './routes/xxx'）
 *    - {VALIDATE_CONFIG}   → 是否需要启动时校验配置
 *    - {RAW_BODY}          → 是否需要保留原始请求体（回调场景）
 *    - {PATH_REWRITE}      → 是否需要剥离函数名前缀
 */

const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');

const app = express();

// ─── 启动时校验配置（可选）───
// const { validateConfig } = require('./config/config');
// validateConfig();

// ─── CORS 中间件 ─────────────
// 通过环境变量 corsAllowOrigin 配置允许的来源，多个域名用逗号分隔
// 例：corsAllowOrigin=https://a.com,https://b.com
app.use((req, res, next) => {
  const allowedOrigins = process.env.corsAllowOrigin
    ? process.env.corsAllowOrigin.split(',').map(s => s.trim())
    : [];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(logger('dev'));

// Body parser（根据需要选择是否保留 rawBody）
// 模式 A：普通 API（不需要原始请求体）
app.use(express.json());
// 模式 B：回调通知（需保留 rawBody 供验签）
// app.use(express.json({
//   verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
// }));
app.use(express.urlencoded({ extended: false }));

// ─── 路径重写（可选）───────────
// CloudBase HTTP 函数调用时，路径可能带有函数名前缀
// 例：/{function-name}/api/path → /api/path
// app.use((req, res, next) => {
//   const prefix = '/{function-name}';
//   if (req.path.startsWith(prefix + '/') || req.path === prefix) {
//     const newPath = req.path.slice(prefix.length) || '/';
//     req.url = newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
//   }
//   next();
// });

// ─── 业务路由 ──────────────────
// const router = require('{ROUTER_PATH}');
// app.use('{ROUTE_PREFIX}', router);

// 健康检查
app.get('/', (req, res) => {
  res.json({
    code: 0,
    msg: '{FUNCTION_NAME} ok',
    version: '1.0.0',
  });
});

// ─── 错误处理 ──────────────────
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

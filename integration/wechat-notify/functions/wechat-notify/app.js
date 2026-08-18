const express = require('express');

const app = express();

// ─── 中间件 ────────────────────────────────────────────────────────────────

// 解析 JSON / form / 纯文本（集成中心推过来的格式不确定，全部兜住）
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: ['text/*', 'application/xml'] }));

// ─── 🔍 调试日志：打印每个请求的原始路径 ─────────────────────────────────────
app.use((req, res, next) => {
  console.log('[incoming]', req.method, req.path, '| originalUrl:', req.originalUrl);
  next();
});

// ─── 路径重写：剥离函数名前缀 ────────────────────────────────────────────────
app.use((req, res, next) => {
  const prefix = '/wechat-notify';
  if (req.path.startsWith(prefix + '/') || req.path === prefix) {
    const newPath = req.path.slice(prefix.length) || '/';
    req.url = newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    console.log('[rewrite]', req.method, req.originalUrl, '->', newPath);
  }
  next();
});

// ─── 路由 ─────────────────────────────────────────────────────────────────

// 统一回调入口（云函数网关会把路径吃掉，所有请求到达时 path 都是 /）
const notifyRouter = require('./routes/notify');

// GET / — 微信 URL 验证（signature/timestamp/nonce/echostr）
app.get('/', (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;

  // 如果带了微信验证参数，走验证逻辑
  if (signature && timestamp && nonce) {
    console.log('🔔 [GET /] 微信 URL 验证请求');
    console.log('  query:', JSON.stringify(req.query));

    if (echostr) {
      console.log('  ✅ 返回 echostr:', echostr);
      return res.status(200).send(echostr);
    }

    // 有签名但没 echostr，返回 success 表示收到
    return res.status(200).send('success');
  }

  // 无微信参数 → 普通健康检查
  res.json({
    code: 0,
    msg: 'wechat-notify ok',
    version: '1.0.0',
    description: '微信回调接收器',
  });
});

// POST / — 接收微信推送的消息/事件回调
app.post('/', (req, res) => {
  const ts = new Date().toISOString();
  const body = req.body;

  console.log('');
  console.log('🔥🔥🔥 收到微信回调推送 🔥🔥🔥');
  console.log(`📨 [POST /] ${ts}`);
  console.log('📦 headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  console.log('🔥🔥🔥 回调处理完毕 🔥🔥🔥');
  console.log('');

  // 返回 success（微信要求，否则会重试）
  res.status(200).send('success');
});

// 保留子路径路由（以防未来网关行为变化）
app.use('/wechat', notifyRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ code: -1, msg: 'Not Found' });
});

// ─── 错误处理 ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: -1, msg: '服务内部错误' });
});

module.exports = app;

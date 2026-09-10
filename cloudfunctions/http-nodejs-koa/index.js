'use strict';
// 使用 Koa 框架的最小化 HTTP 函数模板
// Minimal HTTP function template powered by the Koa framework
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

const PORT = process.env.PORT || 9000;

// 健康检查 / Health check
router.get('/', (ctx) => {
  ctx.body = {
    message: 'Hello World from Koa!',
    method: ctx.method,
    path: ctx.path,
    timestamp: new Date().toISOString(),
  };
});

// 示例 JSON 路由 / Sample JSON route
router.get('/json', (ctx) => {
  ctx.body = {
    code: 200,
    data: { a: 123 },
  };
});

// 回显请求体 / Echo route
router.post('/echo', (ctx) => {
  ctx.body = {
    code: 200,
    requestBody: ctx.request.body || {},
  };
});

app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(PORT, '0.0.0.0', () => {
  console.log(`http-nodejs-koa listening on 0.0.0.0:${PORT}`);
});

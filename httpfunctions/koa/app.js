const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');
const logger = require('koa-logger');

const app = new Koa();
const router = new Router();

// 中间件配置
app.use(cors());
app.use(bodyParser());

// 只在非云函数环境启用日志
if (!process.env.SERVERLESS) {
  app.use(logger());
}

// 全局错误处理
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);
    ctx.status = err.status || 500;
    ctx.body = {
      error: true,
      message: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    };
  }
});

// HelloWorld 主页
router.get('/', async (ctx) => {
  ctx.body = {
    message: 'Hello World!',
    framework: 'Koa',
    version: require('./package.json').version,
    node_version: process.version,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
});

// 个性化问候
router.get('/hello/:name?', async (ctx) => {
  const name = ctx.params.name || 'World';
  ctx.body = {
    message: `Hello, ${name}!`,
    greeting: '欢迎使用 Koa 云函数',
    timestamp: new Date().toISOString()
  };
});

// 系统信息
router.get('/info', async (ctx) => {
  const memoryUsage = process.memoryUsage();
  
  ctx.body = {
    application: {
      name: 'Koa HelloWorld',
      framework: 'Koa',
      version: require('./package.json').version,
      environment: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: 'zh-CN'
    },
    system: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      memory_usage: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      memory_heap_used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      memory_heap_total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      uptime: `${Math.round(process.uptime())} seconds`
    },
    timestamp: new Date().toISOString()
  };
});

// API 路由组
const apiRouter = new Router({ prefix: '/api' });

// API HelloWorld
apiRouter.get('/hello/:name?', async (ctx) => {
  const name = ctx.params.name || 'API User';
  ctx.body = {
    message: `Hello, ${name}!`,
    api_version: 'v1',
    timestamp: new Date().toISOString()
  };
});

// API 系统信息
apiRouter.get('/info', async (ctx) => {
  ctx.body = {
    api: {
      name: 'Koa HelloWorld API',
      version: 'v1',
      framework: 'Koa',
      status: 'running'
    },
    server: {
      node_version: process.version,
      koa_version: require('koa/package.json').version,
      timestamp: new Date().toISOString()
    }
  };
});

// 健康检查
apiRouter.get('/health', async (ctx) => {
  ctx.body = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      memory: 'ok',
      process: 'ok'
    }
  };
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

// 404 处理
app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = {
    error: true,
    message: 'Not Found',
    path: ctx.path,
    method: ctx.method,
    timestamp: new Date().toISOString()
  };
});

// 启动服务器
const port = process.env.PORT || 9000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`🚀 Koa HelloWorld server running on http://${host}:${port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Node.js: ${process.version}`);
  console.log(`📦 Koa: ${require('koa/package.json').version}`);
});

module.exports = app;
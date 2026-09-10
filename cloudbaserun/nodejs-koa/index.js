const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
router.get('/', ctx => { ctx.body = { message: 'Hello World from Koa on CloudBase Run!', timestamp: new Date().toISOString() }; });
app.use(router.routes());
app.listen(8080, '0.0.0.0', () => console.log('Koa on 8080'));

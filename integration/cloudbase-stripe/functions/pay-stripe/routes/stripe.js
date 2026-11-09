const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// ========== 正向下单（鉴权保护）==========

// 创建 Checkout Session，返回 { sessionId, url }
router.post('/create_session', stripeController.payMiddleware, stripeController.createSession);

// 查询 Session 状态
router.post('/retrieve_session', stripeController.payMiddleware, stripeController.retrieveSession);
router.get('/retrieve_session', stripeController.payMiddleware, stripeController.retrieveSession);

// 发起退款（先按 session 校验归属，再退该 Session 的 PaymentIntent）
// 退款结果以 Webhook charge.refunded 为最终凭据
router.post('/create_refund', stripeController.payMiddleware, stripeController.createRefund);

// ========== 异步回调（无鉴权，靠签名保证可信）==========

// Stripe 所有事件都投递到这一条路由，内部按 event.type 分发。
// `/notify` 是集成中心 stripe-pay 模板约定的回调 path（见 app.js 的根路径挂载）。
router.post('/notify', stripeController.webhook);

module.exports = router;

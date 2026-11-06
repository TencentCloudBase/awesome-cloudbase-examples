const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');

// ========== 正向下单（鉴权保护）==========

// 创建 Checkout Session，返回 { sessionId, url }
router.post('/create_session', stripeController.payMiddleware, stripeController.createSession);

// 查询 Session 状态
router.post('/retrieve_session', stripeController.payMiddleware, stripeController.retrieveSession);
router.get('/retrieve_session', stripeController.payMiddleware, stripeController.retrieveSession);

// ========== 异步回调（无鉴权，靠签名保证可信）==========

// Stripe 所有事件都投递到这一条路由，内部按 event.type 分发
router.post('/webhook', stripeController.webhook);

module.exports = router;

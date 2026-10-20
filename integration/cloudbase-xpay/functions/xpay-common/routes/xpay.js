const express = require('express');
const router = express.Router();
const xpayController = require('../controllers/xpayController');

// ========== 正向下单（鉴权保护）==========

// 下单：返回 payData 给 wx.requestVirtualPayment
router.post('/create_order', xpayController.payMiddleware, xpayController.createOrder);

// 查单：推送丢失时兜底补发货
router.post('/query_order', xpayController.payMiddleware, xpayController.queryOrder);

// ========== 异步回调（无鉴权，网关验签解密后转发明文）==========

// 所有 xpay_* 事件统一走这一条路由
router.post('/callback', xpayController.callback);

module.exports = router;

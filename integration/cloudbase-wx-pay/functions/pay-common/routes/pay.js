const express = require('express');
const router = express.Router();
const payController = require('../controllers/payController');

// ========== 下单（鉴权保护）==========

// JSAPI / 小程序下单
router.post('/wxpay_order', payController.payMiddleware, payController.unifiedOrder);
// H5 下单（额外安全中间件：Origin 白名单 + 登录态）
router.post('/wxpay_order_h5', payController.h5SecurityMiddleware, payController.unifiedOrderH5);
// Native 扫码下单
router.post('/wxpay_order_native', payController.payMiddleware, payController.unifiedOrderNative);

// ========== 查询（鉴权保护）==========

// 通过商户订单号查询
router.post('/wxpay_query_order_by_out_trade_no', payController.payMiddleware, payController.queryOrderByOutTradeNo);
// 通过微信订单号查询
router.post('/wxpay_query_order_by_transaction_id', payController.payMiddleware, payController.queryOrderByTransactionId);

// ========== 关闭订单（鉴权保护）==========

router.post('/wxpay_close_order', payController.payMiddleware, payController.closeOrder);

// ========== 退款（鉴权保护）==========

router.post('/wxpay_refund', payController.payMiddleware, payController.refund);
router.post('/wxpay_refund_query', payController.payMiddleware, payController.queryRefund);

// ========== 商家转账（升级版，鉴权保护）==========

// 发起商家转账
router.post('/wxpay_transfer', payController.payMiddleware, payController.transfer);
// 商户单号查询转账单
router.post('/wxpay_transfer_bill_query', payController.payMiddleware, payController.queryTransferBill);
// 微信单号查询转账单
router.post('/wxpay_transfer_bill_query_by_no', payController.payMiddleware, payController.queryTransferBillByNo);
// 兼容旧路由（查询转账批次 → 重定向到查询转账单）
router.post('/wxpay_transfer_batch_query', payController.payMiddleware, payController.queryTransferBill);

// ========== 回调通知（无鉴权，微信支付服务器 / 集成中心网关直接调用）==========

// 支付回调
router.post('/unifiedOrderTrigger', payController.unifiedOrderTrigger);
// 退款回调
router.post('/refundTrigger', payController.refundTrigger);
// 商家转账回调
router.post('/transferTrigger', payController.transferTrigger);

module.exports = router;

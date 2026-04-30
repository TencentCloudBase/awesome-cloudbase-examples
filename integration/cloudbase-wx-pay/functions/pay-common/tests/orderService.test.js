/**
 * orderService.js 单元测试
 * 业务钩子层：验证接口签名、默认行为（返回 true）、参数透传
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const OrderService = require('../services/orderService');

describe('OrderService - 接口签名', () => {

    const os = new OrderService();

    it('handlerUnified 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerUnified, 'function');
    });

    it('handlerUnifiedTrigger 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerUnifiedTrigger, 'function');
    });

    it('handlerRefund 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerRefund, 'function');
    });

    it('handlerRefundTrigger 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerRefundTrigger, 'function');
    });

    it('handlerTransfer 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerTransfer, 'function');
    });

    it('handlerTransferTrigger 是 async 方法', () => {
        assert.strictEqual(typeof os.handlerTransferTrigger, 'function');
    });
});

describe('OrderService - 默认行为（空壳实现返回 true）', () => {

    const os = new OrderService();

    it('handlerUnified → 返回 true', async () => {
        const result = await os.handlerUnified({
            out_trade_no: 'TEST001',
            description: '商品',
            amount: { total: 100 },
        });
        assert.strictEqual(result, true);
    });

    it('handlerUnifiedTrigger → 返回 true（模拟支付回调）', async () => {
        const result = await os.handlerUnifiedTrigger({
            out_trade_no: 'TEST001',
            transaction_id: 'wx_txn_001',
            trade_state: 'SUCCESS',
            amount: { total: 100, payer_total: 100 },
            payer: { openid: 'oUpF8xxx' },
        });
        assert.strictEqual(result, true);
    });

    it('handlerRefund → 返回 true', async () => {
        const result = await os.handlerRefund({
            out_trade_no: 'TEST001',
            out_refund_no: 'REFUND001',
            amount: { total: 100, refund: 50 },
        });
        assert.strictEqual(result, true);
    });

    it('handlerRefundTrigger → 返回 true', async () => {
        const result = await os.handlerRefundTrigger({
            out_trade_no: 'TEST001',
            out_refund_no: 'REFUND001',
            transaction_id: 'wx_txn_002',
            refund_status: 'SUCCESS',
            amount: { total: 100, refund: 50 },
        });
        assert.strictEqual(result, true);
    });

    it('handlerTransfer → 返回 true', async () => {
        const result = await os.handlerTransfer(
            { out_bill_no: 'BILL001', transfer_amount: 100, openid: 'oUpF8xxx' },
            { transfer_bill_no: 'wx_bill_001', out_bill_no: 'BILL001', state: 'PROCESSING' },
        );
        assert.strictEqual(result, true);
    });

    it('handlerTransferTrigger → 返回 true', async () => {
        const result = await os.handlerTransferTrigger({
            mchid: '1234567890',
            out_bill_no: 'BILL001',
            transfer_bill_no: 'wx_bill_001',
            state: 'SUCCESS',
        });
        assert.strictEqual(result, true);
    });
});

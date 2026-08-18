/**
 * validator.js 单元测试
 * 运行：npx jest tests/validator.test.js
 *   或：node --test tests/validator.test.js（Node 18+）
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateOrderParams, validateRefundParams, validateTransferParams } = require('../utils/validator');

// ========== validateOrderParams ==========

describe('validateOrderParams', () => {

    it('合法参数 → 无错误', () => {
        const errors = validateOrderParams({
            description: '测试商品',
            amount: { total: 100 },
        });
        assert.deepStrictEqual(errors, []);
    });

    it('合法参数（含 out_trade_no）→ 无错误', () => {
        const errors = validateOrderParams({
            description: '测试商品',
            amount: { total: 1 },
            out_trade_no: 'order_20260423_001',
        });
        assert.deepStrictEqual(errors, []);
    });

    // --- description ---

    it('缺少 description → 报错', () => {
        const errors = validateOrderParams({ amount: { total: 100 } });
        assert.ok(errors.some(e => e.includes('description')));
    });

    it('description 非字符串 → 报错', () => {
        const errors = validateOrderParams({ description: 123, amount: { total: 100 } });
        assert.ok(errors.some(e => e.includes('description')));
    });

    it('description 超过 127 字符 → 报错', () => {
        const errors = validateOrderParams({
            description: 'a'.repeat(128),
            amount: { total: 100 },
        });
        assert.ok(errors.some(e => e.includes('127')));
    });

    // --- amount ---

    it('缺少 amount → 报错', () => {
        const errors = validateOrderParams({ description: '商品' });
        assert.ok(errors.some(e => e.includes('amount.total')));
    });

    it('amount.total 为 0 → 报错', () => {
        const errors = validateOrderParams({ description: '商品', amount: { total: 0 } });
        assert.ok(errors.some(e => e.includes('amount.total')));
    });

    it('amount.total 为负数 → 报错', () => {
        const errors = validateOrderParams({ description: '商品', amount: { total: -1 } });
        assert.ok(errors.some(e => e.includes('正整数')));
    });

    it('amount.total 为浮点数 → 报错', () => {
        const errors = validateOrderParams({ description: '商品', amount: { total: 1.5 } });
        assert.ok(errors.some(e => e.includes('正整数')));
    });

    // --- out_trade_no ---

    it('out_trade_no 太短（<6 位）→ 报错', () => {
        const errors = validateOrderParams({
            description: '商品',
            amount: { total: 100 },
            out_trade_no: '12345',
        });
        assert.ok(errors.some(e => e.includes('6-32')));
    });

    it('out_trade_no 太长（>32 位）→ 报错', () => {
        const errors = validateOrderParams({
            description: '商品',
            amount: { total: 100 },
            out_trade_no: 'a'.repeat(33),
        });
        assert.ok(errors.some(e => e.includes('6-32')));
    });

    it('out_trade_no 含特殊字符 → 报错', () => {
        const errors = validateOrderParams({
            description: '商品',
            amount: { total: 100 },
            out_trade_no: 'order#123456',
        });
        assert.ok(errors.some(e => e.includes('字母、数字、下划线、连字符')));
    });
});

// ========== validateRefundParams ==========

describe('validateRefundParams', () => {

    const validRefund = {
        out_trade_no: 'order001',
        out_refund_no: 'refund001',
        amount: { refund: 50, total: 100 },
    };

    it('合法参数 → 无错误', () => {
        assert.deepStrictEqual(validateRefundParams(validRefund), []);
    });

    it('用 transaction_id 代替 out_trade_no → 无错误', () => {
        const errors = validateRefundParams({
            transaction_id: 'wx_txn_001',
            out_refund_no: 'refund001',
            amount: { refund: 50, total: 100 },
        });
        assert.deepStrictEqual(errors, []);
    });

    it('out_trade_no 和 transaction_id 都缺 → 报错', () => {
        const errors = validateRefundParams({
            out_refund_no: 'refund001',
            amount: { refund: 50, total: 100 },
        });
        assert.ok(errors.some(e => e.includes('out_trade_no') && e.includes('transaction_id')));
    });

    it('缺少 out_refund_no → 报错', () => {
        const errors = validateRefundParams({
            out_trade_no: 'order001',
            amount: { refund: 50, total: 100 },
        });
        assert.ok(errors.some(e => e.includes('out_refund_no')));
    });

    it('缺少 amount → 报错', () => {
        const errors = validateRefundParams({
            out_trade_no: 'order001',
            out_refund_no: 'refund001',
        });
        assert.ok(errors.some(e => e.includes('amount')));
    });

    it('refund 为 0 → 报错', () => {
        const errors = validateRefundParams({
            out_trade_no: 'order001',
            out_refund_no: 'refund001',
            amount: { refund: 0, total: 100 },
        });
        assert.ok(errors.some(e => e.includes('退款金额') && e.includes('正整数')));
    });

    it('退款金额 > 订单金额 → 报错', () => {
        const errors = validateRefundParams({
            out_trade_no: 'order001',
            out_refund_no: 'refund001',
            amount: { refund: 200, total: 100 },
        });
        assert.ok(errors.some(e => e.includes('不能大于')));
    });
});

// ========== validateTransferParams ==========

describe('validateTransferParams', () => {

    const validTransfer = {
        out_bill_no: 'bill20260423001',
        transfer_scene_id: '1000',
        openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o',
        transfer_amount: 100,
        transfer_remark: '营销活动奖励',
        transfer_scene_report_infos: [{ info_type: 'ACTIVITY_NAME', info_value: '春季活动' }],
    };

    it('合法参数 → 无错误', () => {
        assert.deepStrictEqual(validateTransferParams(validTransfer), []);
    });

    // --- out_bill_no ---

    it('缺少 out_bill_no → 报错', () => {
        const p = { ...validTransfer };
        delete p.out_bill_no;
        assert.ok(validateTransferParams(p).some(e => e.includes('out_bill_no')));
    });

    it('out_bill_no 含特殊字符 → 报错', () => {
        const p = { ...validTransfer, out_bill_no: 'bill-001' };
        assert.ok(validateTransferParams(p).some(e => e.includes('out_bill_no')));
    });

    it('out_bill_no 超过 32 位 → 报错', () => {
        const p = { ...validTransfer, out_bill_no: 'a'.repeat(33) };
        assert.ok(validateTransferParams(p).some(e => e.includes('out_bill_no')));
    });

    // --- transfer_scene_id ---

    it('缺少 transfer_scene_id → 报错', () => {
        const p = { ...validTransfer };
        delete p.transfer_scene_id;
        assert.ok(validateTransferParams(p).some(e => e.includes('transfer_scene_id')));
    });

    // --- openid ---

    it('缺少 openid → 报错', () => {
        const p = { ...validTransfer };
        delete p.openid;
        assert.ok(validateTransferParams(p).some(e => e.includes('openid')));
    });

    // --- transfer_amount ---

    it('transfer_amount 为 0 → 报错', () => {
        const p = { ...validTransfer, transfer_amount: 0 };
        assert.ok(validateTransferParams(p).some(e => e.includes('正整数')));
    });

    it('transfer_amount < 30 分（低于最低限额）→ 报错', () => {
        const p = { ...validTransfer, transfer_amount: 29 };
        assert.ok(validateTransferParams(p).some(e => e.includes('30 分')));
    });

    it('transfer_amount = 30（边界值最低）→ 无此错误', () => {
        const p = { ...validTransfer, transfer_amount: 30 };
        const errors = validateTransferParams(p);
        assert.ok(!errors.some(e => e.includes('30 分')));
    });

    it('transfer_amount >= 200000（超免密上限）→ 报错', () => {
        const p = { ...validTransfer, transfer_amount: 200000 };
        assert.ok(validateTransferParams(p).some(e => e.includes('2000 元')));
    });

    it('transfer_amount = 199999（免密上限内）→ 无此错误', () => {
        const p = { ...validTransfer, transfer_amount: 199999 };
        const errors = validateTransferParams(p);
        assert.ok(!errors.some(e => e.includes('2000 元')));
    });

    // --- transfer_remark ---

    it('缺少 transfer_remark → 报错', () => {
        const p = { ...validTransfer };
        delete p.transfer_remark;
        assert.ok(validateTransferParams(p).some(e => e.includes('transfer_remark')));
    });

    it('transfer_remark 超过 32 个字符 → 报错', () => {
        const p = { ...validTransfer, transfer_remark: '这是一段超长的转账备注用来测试最大长度限制是否生效超过三十二个字符' };
        assert.ok(validateTransferParams(p).some(e => e.includes('32')));
    });

    it('transfer_remark = 32 个字符（边界值）→ 无此错误', () => {
        const p = { ...validTransfer, transfer_remark: 'a'.repeat(32) };
        const errors = validateTransferParams(p);
        assert.ok(!errors.some(e => e.includes('32 个字符')));
    });

    // --- user_name ---

    it('包含 user_name → 报错（模板不支持）', () => {
        const p = { ...validTransfer, user_name: '张三' };
        assert.ok(validateTransferParams(p).some(e => e.includes('user_name')));
    });

    // --- transfer_scene_report_infos ---

    it('缺少 transfer_scene_report_infos → 报错', () => {
        const p = { ...validTransfer };
        delete p.transfer_scene_report_infos;
        assert.ok(validateTransferParams(p).some(e => e.includes('transfer_scene_report_infos')));
    });

    it('transfer_scene_report_infos 为空数组 → 报错', () => {
        const p = { ...validTransfer, transfer_scene_report_infos: [] };
        assert.ok(validateTransferParams(p).some(e => e.includes('transfer_scene_report_infos')));
    });
});

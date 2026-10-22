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

    const baseParams = {
        out_trade_no: 'TEST001',
        description: '商品',
        amount: { total: 100 },
    };

    it('handlerUnified → 返回 true', async () => {
        const result = await os.handlerUnified(baseParams, { openid: 'oUpF8uMuAjOMuAjO_1', uid: 'uid_001' });
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

describe('OrderService - 归属标识解析 resolveOwner', () => {

    const os = new OrderService();
    const OPENID = 'oUpF8uMuAjOMuAjO_1';

    it('有 openid 时优先用 identity.openid', () => {
        assert.strictEqual(
            os.resolveOwner({}, { openid: OPENID, uid: 'uid_001' }),
            OPENID
        );
    });

    it('没有 openid 时**必须**回退 identity.uid（H5 微信外登录只有 UID）', () => {
        assert.strictEqual(
            os.resolveOwner({ payer: {} }, { openid: null, uid: 'uid_001' }),
            'uid_001'
        );
    });

    it('identity 为 null 且 payer 缺失 → 返回 null（不落库无主订单）', () => {
        assert.strictEqual(os.resolveOwner({ out_trade_no: 'TEST001' }, null), null);
        assert.strictEqual(os.resolveOwner({ out_trade_no: 'TEST001' }, {}), null);
    });

    it('⛔ 脏值一律丢弃：非字符串 / 空串 / 超长 / 非法字符', () => {
        assert.strictEqual(os.resolveOwner({}, { openid: { a: 1 } }), null, '对象不能当归属');
        assert.strictEqual(os.resolveOwner({}, { openid: 12345 }), null, '数字不能当归属');
        assert.strictEqual(os.resolveOwner({}, { openid: '   ' }), null, '空串不能当归属');
        assert.strictEqual(os.resolveOwner({}, { uid: 'x'.repeat(129) }), null, '超 128 位不能当归属');
        assert.strictEqual(os.resolveOwner({}, { uid: 'uid/<script>' }), null, '含非法字符不能当归属');
    });

    it('⛔ identity 全空时**不再**回退 params.payer.openid（请求体不可信）', () => {
        // params.payer.openid 由客户端填写，曾作为第三候选 → 任何人都能把订单记到别人名下
        assert.strictEqual(os.resolveOwner({ payer: { openid: OPENID } }, null), null);
        assert.strictEqual(os.resolveOwner({ payer: { openid: OPENID } }, {}), null);
        assert.strictEqual(os.resolveOwner({ payer: { openid: 'bad!!' } }, null), null);
    });
});

describe('OrderService - 业务钩子（默认 fail closed）', () => {

    /**
     * 按给定环境变量重新加载 OrderService（config 在 require 时读取 env）
     * @param {Object} env - 环境变量覆盖
     */
    function loadOrderService(env = {}) {
        [ '../services/orderService', '../config/config' ].forEach(
            mod => delete require.cache[require.resolve(mod)]
        );
        const orig = {};
        for (const [k, v] of Object.entries(env)) {
            orig[k] = process.env[k];
            // v === undefined 表示「不设这个变量」，删掉才算真正漏配
            v === undefined ? delete process.env[k] : (process.env[k] = v);
        }
        try {
            return require('../services/orderService');
        } finally {
            for (const k of Object.keys(env)) {
                orig[k] !== undefined ? (process.env[k] = orig[k]) : delete process.env[k];
            }
        }
    }

    it('⛔ verifyAmount 默认拒绝下单（不返回 null 静默放行）', async () => {
        const OS = loadOrderService({ PAY_GUARD: 'on' });
        const check = await new OS().verifyAmount({ out_trade_no: 'T1', amount: { total: 1 } });
        assert.strictEqual(check.ok, false, '未核定金额时必须拒绝');
        assert.ok(check.reason.includes('verifyAmount'));
    });

    it('⛔ verifyRefundAmount 默认拒绝退款（不返回 null 静默放行）', async () => {
        const OS = loadOrderService({ PAY_GUARD: 'on' });
        const check = await new OS().verifyRefundAmount({
            out_trade_no: 'T1', out_refund_no: 'R1', amount: { refund: 999999, total: 999999 },
        });
        assert.strictEqual(check.ok, false, '未核定可退金额时必须拒绝');
        assert.ok(check.reason.includes('verifyRefundAmount'));
    });

    it('⛔ verifyOrderOwner / verifyTransferAllowed 默认拒绝（默认 403）', async () => {
        const OS = loadOrderService({ PAY_GUARD: 'on' });
        const os = new OS();
        assert.strictEqual((await os.verifyOrderOwner({ out_trade_no: 'T1' }, null)).ok, false);
        assert.strictEqual((await os.verifyTransferAllowed({ openid: 'o_x' }, null)).ok, false);
    });

    it('⛔ 不设 PAY_GUARD（漏配）也按生产处理：4 个钩子全部拒绝', async () => {
        const OS = loadOrderService({ PAY_GUARD: undefined });
        const os = new OS();
        assert.strictEqual((await os.verifyAmount({ amount: { total: 1 } })).ok, false);
        assert.strictEqual((await os.verifyRefundAmount({ amount: { refund: 999999 } })).ok, false);
        assert.strictEqual((await os.verifyOrderOwner({ out_trade_no: 'T1' })).ok, false);
        assert.strictEqual((await os.verifyTransferAllowed({ openid: 'o_x' })).ok, false);
    });

    it('PAY_GUARD=off 时 4 个钩子全部放行（仅本地联调）', async () => {
        const OS = loadOrderService({ PAY_GUARD: 'off' });
        const os = new OS();
        assert.deepStrictEqual(await os.verifyAmount({ amount: { total: 1 } }), { ok: true });
        assert.deepStrictEqual(await os.verifyRefundAmount({ amount: { refund: 50, total: 100 } }), { ok: true });
        assert.deepStrictEqual(await os.verifyOrderOwner({ out_trade_no: 'T1' }), { ok: true });
        assert.deepStrictEqual(await os.verifyTransferAllowed({ openid: 'o_x' }), { ok: true });
    });
});

describe('OrderService - handlerUnified 归属缺失必须失败（不生成无主订单）', () => {

    const os = new OrderService();

    it('⛔ 无 identity 且无 payer.openid → 抛错，不返回 true', async () => {
        await assert.rejects(
            () => os.handlerUnified({ out_trade_no: 'TEST001', amount: { total: 100 } }),
            /归属身份/
        );
    });

    it('⛔ identity 是脏值（空串 / 对象）→ 抛错', async () => {
        await assert.rejects(
            () => os.handlerUnified({ out_trade_no: 'TEST001' }, { openid: '', uid: '  ' }),
            /归属身份/
        );
        await assert.rejects(
            () => os.handlerUnified({ out_trade_no: 'TEST001' }, { openid: {} }),
            /归属身份/
        );
    });

    it('只有 UID 的下单照常成功（H5 场景）', async () => {
        const result = await os.handlerUnified(
            { out_trade_no: 'TEST001' },
            { openid: null, uid: 'uid_001' }
        );
        assert.strictEqual(result, true);
    });
});

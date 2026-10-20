/**
 * 订单归属校验
 *
 * 覆盖点：code2Session 只能证明「你是谁」，不能证明「这单是你的」。
 * 缺这层校验时，任何人拿自己的 code + 别人的 outTradeNo 就能查单（越权读），
 * 批量遍历还能探测订单是否存在与状态。
 */

const { test } = require('node:test');
const assert = require('node:assert');

const { checkOrderOwnership } = require('../services/xpayService');

test('同一用户查自己的订单：通过', () => {
    assert.strictEqual(
        checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, 'o_userA'),
        null
    );
});

test('⚠️ 他人订单：必须拒绝（越权读）', () => {
    const msg = checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, 'o_userB');
    assert.ok(msg, '查到别人的单必须返回错误');
    assert.match(msg, /不属于当前用户/);
});

test('本地无记录（冷启动 / 多实例）：放行，不误伤查单兜底', () => {
    assert.strictEqual(checkOrderOwnership(undefined, 'o_userA'), null);
});

// 旧实现直接放行 —— 回调路径 _updateOrderState 兜底创建的记录不带 openid，
// 于是「记录存在但没有归属」成了越权查单的入口。无法判断归属就按失败处理。
test('⚠️ 记录存在但没有 openid：拒绝，不能当「无记录」放行', () => {
    const msg = checkOrderOwnership({ outTradeNo: 'A20260101' }, 'o_userA');
    assert.ok(msg, '缺归属的记录必须拒绝');
    assert.match(msg, /缺少归属信息/);
});

test('请求侧 openid 缺失：交给上层判空，不在这里拦', () => {
    assert.strictEqual(checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, ''), null);
});

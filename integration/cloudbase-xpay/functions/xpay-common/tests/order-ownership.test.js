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

test('记录里没有 openid（旧数据 / 推送先于下单落库）：放行', () => {
    assert.strictEqual(checkOrderOwnership({ outTradeNo: 'A20260101' }, 'o_userA'), null);
});

test('请求侧 openid 缺失：交给上层判空，不在这里拦', () => {
    assert.strictEqual(checkOrderOwnership({ outTradeNo: 'A20260101', openid: 'o_userA' }, ''), null);
});

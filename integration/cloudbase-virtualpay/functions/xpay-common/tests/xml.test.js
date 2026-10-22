const test = require('node:test');
const assert = require('node:assert');
const { xmlToObject, parsePayload } = require('../utils/xml');

test('解析带 CDATA 的 XML 推送', () => {
    const xml = '<xml>'
        + '<ToUserName><![CDATA[gh_test]]></ToUserName>'
        + '<Event><![CDATA[xpay_goods_deliver_notify]]></Event>'
        + '<OutTradeNo><![CDATA[ORDER20261014001]]></OutTradeNo>'
        + '<Env><![CDATA[0]]></Env>'
        + '</xml>';

    const obj = xmlToObject(xml);

    assert.strictEqual(obj.Event, 'xpay_goods_deliver_notify');
    assert.strictEqual(obj.OutTradeNo, 'ORDER20261014001');
    assert.strictEqual(obj.ToUserName, 'gh_test');
});

test('解析不带 CDATA 的 XML 推送', () => {
    const xml = '<xml><Event>xpay_refund_notify</Event><OutTradeNo>ORDER20261014002</OutTradeNo></xml>';
    const obj = xmlToObject(xml);

    assert.strictEqual(obj.Event, 'xpay_refund_notify');
    assert.strictEqual(obj.OutTradeNo, 'ORDER20261014002');
});

test('外层 <xml> 不会吞掉内层字段', () => {
    const xml = '<xml><Event>xpay_goods_deliver_notify</Event></xml>';
    const obj = xmlToObject(xml);

    // 回归防护：曾因内容用 [\\s\\S]*? 导致结果只剩 { xml: '...' }
    assert.strictEqual(obj.xml, undefined, '不应把外层 xml 当字段');
    assert.strictEqual(obj.Event, 'xpay_goods_deliver_notify');
});

// 曾经 CDATA 分支写成 {1,8192}?：上限卡在单字段 8192，超长字段两条分支都匹配不上，
// 结果是「整个字段消失」而不是截断 —— 下游取不到 Event → 结构性错误 → 回 ErrCode=0 丢单
test('⚠️ 超长 CDATA（> 8192 字符）不能丢字段', () => {
    const long = 'x'.repeat(8193);
    const obj = xmlToObject(`<xml><Attach><![CDATA[${long}]]></Attach><Event>xpay_refund_notify</Event></xml>`);

    assert.strictEqual(obj.Attach, long);
    assert.strictEqual(obj.Event, 'xpay_refund_notify');
});

test('⚠️ 空 CDATA 返回空串，而不是丢字段', () => {
    const obj = xmlToObject('<xml><Attach><![CDATA[]]></Attach><Event>xpay_goods_deliver_notify</Event></xml>');

    assert.strictEqual(obj.Attach, '');
    assert.strictEqual(obj.Event, 'xpay_goods_deliver_notify');
});

test('非字符串输入返回空对象', () => {
    assert.deepStrictEqual(xmlToObject(null), {});
    assert.deepStrictEqual(xmlToObject({ a: 1 }), {});
    assert.deepStrictEqual(xmlToObject(undefined), {});
});

// ========== parsePayload：按明文形态自动选择 JSON / XML ==========

test('⚠️ parsePayload：JSON 明文按 JSON 解析（后台数据格式选 JSON 时解密结果就是它）', () => {
    const plain = '{"ToUserName":"gh_test","Event":"xpay_goods_deliver_notify","Env":0}';
    const obj = parsePayload(plain);

    assert.strictEqual(obj.Event, 'xpay_goods_deliver_notify');
    assert.strictEqual(obj.Env, 0);
});

test('parsePayload：XML 明文仍按 XML 解析', () => {
    const plain = '<xml><Event>xpay_refund_notify</Event></xml>';
    const obj = parsePayload(plain);

    assert.strictEqual(obj.Event, 'xpay_refund_notify');
});

test('parsePayload：对象直接返回，不重复解析', () => {
    const input = { Event: 'xpay_goods_deliver_notify' };
    assert.strictEqual(parsePayload(input), input);
});

test('parsePayload：形态无法判断时返回空对象，不抛错', () => {
    assert.deepStrictEqual(parsePayload(''), {});
    assert.deepStrictEqual(parsePayload('not-a-payload'), {});
    assert.deepStrictEqual(parsePayload(null), {});
});

test('parsePayload：JSON 前后有空白也能解析', () => {
    const obj = parsePayload('\n  {"Event":"xpay_coin_pay_notify"}  \n');
    assert.strictEqual(obj.Event, 'xpay_coin_pay_notify');
});

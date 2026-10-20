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

const test = require('node:test');
const assert = require('node:assert');
const { toMinorUnits, fromMinorUnits, isZeroDecimal } = require('../utils/currency');

test('普通币种主单位转最小单位（×100）', () => {
    assert.strictEqual(toMinorUnits(20, 'usd'), 2000);
    assert.strictEqual(toMinorUnits(20.5, 'usd'), 2050);
    assert.strictEqual(toMinorUnits(1, 'eur'), 100);
});

test('零小数币种不乘 100（JPY/KRW/VND）', () => {
    assert.strictEqual(toMinorUnits(500, 'jpy'), 500);
    assert.strictEqual(toMinorUnits(5000, 'krw'), 5000);
    assert.strictEqual(toMinorUnits(20000, 'vnd'), 20000);
});

test('币种大小写不敏感', () => {
    assert.strictEqual(toMinorUnits(500, 'JPY'), 500);
    assert.strictEqual(toMinorUnits(20, 'USD'), 2000);
});

test('UGX 按两位处理（Stripe 向后兼容要求，刻意不在零小数列）', () => {
    assert.strictEqual(toMinorUnits(500, 'ugx'), 50000);
    assert.strictEqual(isZeroDecimal('ugx'), false);
});

test('反向换算：最小单位转主单位', () => {
    assert.strictEqual(fromMinorUnits(2000, 'usd'), 20);
    assert.strictEqual(fromMinorUnits(500, 'jpy'), 500);
});

test('isZeroDecimal 判定', () => {
    assert.strictEqual(isZeroDecimal('jpy'), true);
    assert.strictEqual(isZeroDecimal('usd'), false);
});

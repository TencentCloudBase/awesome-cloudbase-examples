/**
 * 下单入参白名单测试
 *
 * 不能把 req.body 整体透传给 Stripe：service 的 `...rest` 会把调用方塞的
 * 未知字段（payment_method_types / customer / 订阅开关等）原样并入 create 请求，
 * 绕过模板对 mode / success_url 的约束。
 */

const test = require('node:test');
const assert = require('node:assert');

process.env.stripeSecretKey = 'sk_' + 'test_' + 'x'.repeat(24);

const {
    pickSessionParams,
    validateSessionParams,
    SESSION_PARAM_WHITELIST,
} = require('../controllers/stripeController');
const { sanitizeLineItems, validateLineItems } = require('../utils/lineItems');

test('白名单：只保留模板支持的字段', () => {
    const picked = pickSessionParams({
        amount: 9.9,
        currency: 'usd',
        productName: 'T',
        success_url: 'https://example.com/ok',
        client_reference_id: 'order_1',
    });
    assert.deepStrictEqual(
        Object.keys(picked).sort(),
        ['amount', 'client_reference_id', 'currency', 'productName', 'success_url'].sort()
    );
});

test('⛔ 未识别字段被丢弃（payment_method_types / customer / 订阅开关）', () => {
    const picked = pickSessionParams({
        amount: 1,
        currency: 'usd',
        payment_method_types: ['card'],
        customer: 'cus_evil',
        subscription_data: { trial_period_days: 999 },
        mode: 'subscription',
    });
    assert.strictEqual(picked.payment_method_types, undefined);
    assert.strictEqual(picked.customer, undefined);
    assert.strictEqual(picked.subscription_data, undefined);
    assert.strictEqual(picked.mode, 'subscription', 'mode 在白名单内，允许显式传（由 service 校验）');
});

test('非对象 body：一律视为空，不抛错', () => {
    assert.deepStrictEqual(pickSessionParams(null), {});
    assert.deepStrictEqual(pickSessionParams(undefined), {});
    assert.deepStrictEqual(pickSessionParams('{"amount":1}'), {});
    assert.deepStrictEqual(pickSessionParams([1, 2, 3]), {});
});

test('白名单常量与 pickSessionParams 一致（新增字段必须同步）', () => {
    assert.ok(Array.isArray(SESSION_PARAM_WHITELIST));
    assert.ok(SESSION_PARAM_WHITELIST.includes('line_items'));
    assert.ok(SESSION_PARAM_WHITELIST.includes('metadata'));
});

// ========== 白名单内字段的取值校验 ==========
// 字段名白名单挡不住恶意取值：金额 / 数量 / 订单号 / 回跳地址都要校验

test('合法入参通过取值校验', () => {
    assert.strictEqual(validateSessionParams({
        amount: 990,
        currency: 'usd',
        quantity: 2,
        productName: 'Pro',
        client_reference_id: 'ORDER_123',
        customer_email: 'a@b.com',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://example.com/cancel',
        mode: 'payment',
    }), null);
});

// 需求 4.4 口径：amount = 最小货币单位整数（9.90 美元传 990），与 Stripe API 一致
test('⛔ amount 必须是最小货币单位的正整数（小数 / 负数 / 0 / NaN 一律拒绝）', () => {
    assert.match(validateSessionParams({ amount: -100 }), /amount/);
    assert.match(validateSessionParams({ amount: 0 }), /amount/);
    assert.match(validateSessionParams({ amount: 'abc' }), /amount/);
    assert.match(validateSessionParams({ amount: 9.9 }), /amount/, '小数说明按主单位传了');
    assert.match(validateSessionParams({ amount: '9.9' }), /amount/);
    assert.match(validateSessionParams({ amount: 1.005 }), /amount/);
});

test('⛔ quantity 必须是正整数', () => {
    assert.match(validateSessionParams({ quantity: 0 }), /quantity/);
    assert.match(validateSessionParams({ quantity: -1 }), /quantity/);
    assert.match(validateSessionParams({ quantity: 1.5 }), /quantity/);
});

// 🚨 不能先 Number(x) 再判断：Number(true)===1、Number([5])===5，
//    布尔 / 单元素数组会被静默当成合法金额
test('⛔ amount 拒绝非数字类型（boolean / array / object）', () => {
    assert.match(validateSessionParams({ amount: true }), /amount/);
    assert.match(validateSessionParams({ amount: false }), /amount/);
    assert.match(validateSessionParams({ amount: [5] }), /amount/);
    assert.match(validateSessionParams({ amount: {} }), /amount/);
    assert.match(validateSessionParams({ amount: '' }), /amount/);
    assert.strictEqual(validateSessionParams({ amount: '990' }), null, '整数数字字符串仍可接受');
});

// 🚨 字符串分支只判「trim 后非空」会被 Number() 静默放大：
//    Number('0x10')===16、Number('1e3')===1000，实际下单金额与调用方预期差几十倍。
test('⛔ amount 拒绝非十进制写法（十六进制 / 科学计数法 / 正负号 / 空白混入）', () => {
    for (const bad of ['0x10', '1e3', '1E3', '+990', '-990', ' 990x', '0b101', 'Infinity', 'NaN', '9_9']) {
        assert.match(validateSessionParams({ amount: bad, currency: 'usd' }), /amount/, bad);
    }
    assert.strictEqual(validateSessionParams({ amount: '990', currency: 'usd' }), null, '纯十进制字符串仍可接受');
    assert.strictEqual(validateSessionParams({ amount: 990, currency: 'usd' }), null);
});

// 兼容旧口径：amount_major 是主单位，服务端换算成最小货币单位
test('✅ amount_major（主单位）可用，换算后必须是正整数', () => {
    assert.strictEqual(validateSessionParams({ amount_major: 9.9, currency: 'usd' }), null);
    assert.strictEqual(validateSessionParams({ amount_major: 500, currency: 'jpy' }), null);
    assert.strictEqual(validateSessionParams({ amount_major: 0.01, currency: 'usd' }), null, '最小可收款金额');
    // 换算后为 0 元的过小金额必须拒绝（Math.round(0.001*100)===0）
    assert.match(validateSessionParams({ amount_major: 0.001, currency: 'usd' }), /amount_major/);
    assert.match(validateSessionParams({ amount_major: 0.4, currency: 'jpy' }), /amount_major/);
    assert.match(validateSessionParams({ amount_major: -1 }), /amount_major/);
    assert.match(validateSessionParams({ amount_major: true }), /amount_major/);
});

test('⛔ amount 与 amount_major 同时传：拒绝，不做隐式取舍', () => {
    assert.match(validateSessionParams({ amount: 990, amount_major: 9.9, currency: 'usd' }), /只能传一个/);
});

// 🚨 与 validateLineItem 第 115 行同口径：quantity 必须是 number 正整数。
//    曾在这里用 isNumberLike 放行字符串 '2'，下游 _buildSessionParams 又原样透传，
//    于是 line_items[0].quantity === '2' 被 Stripe 判 400，调用方只拿到模糊的下游错误。
test('⛔ quantity 拒绝非数字类型（boolean / array / 字符串）', () => {
    assert.match(validateSessionParams({ quantity: true }), /quantity/);
    assert.match(validateSessionParams({ quantity: [2] }), /quantity/);
    assert.match(validateSessionParams({ quantity: {} }), /quantity/);
    assert.match(validateSessionParams({ quantity: '2' }), /quantity/, '字符串 quantity 必须显式拒绝');
    assert.strictEqual(validateSessionParams({ quantity: 2 }), null);
});

test('⛔ currency 必须是 3 位字母币种', () => {
    assert.match(validateSessionParams({ currency: 'dollars' }), /currency/);
    assert.match(validateSessionParams({ currency: 'u1d' }), /currency/);
});

test('⛔ client_reference_id 只允许安全字符（回调按它反查订单）', () => {
    assert.match(validateSessionParams({ client_reference_id: 'order 1' }), /client_reference_id/);
    assert.match(validateSessionParams({ client_reference_id: 'a'.repeat(65) }), /client_reference_id/);
    assert.match(validateSessionParams({ client_reference_id: '../../etc' }), /client_reference_id/);
});

test('⛔ 回跳地址必须是 http/https（开放重定向面）', () => {
    assert.match(validateSessionParams({ success_url: 'javascript:alert(1)' }), /success_url/);
    assert.match(validateSessionParams({ cancel_url: 'ftp://evil.com' }), /cancel_url/);
    assert.match(validateSessionParams({ success_url: 'not a url' }), /success_url/);
});

// ========== metadata：不能静默改写成 {} ==========
// 控制器曾在校验前把非对象 metadata 重置为 {} 并只打 warn —— 既让本文件的
// 对象守卫变成死代码，又让调用方的业务 metadata（如 orderId）被整体丢掉

test('⛔ metadata 非对象：直接 400，不静默改写', () => {
    assert.match(validateSessionParams({ metadata: ['a', 'b'] }), /metadata/);
    assert.match(validateSessionParams({ metadata: 'orderId=1' }), /metadata/);
    assert.match(validateSessionParams({ metadata: 123 }), /metadata/);
    assert.match(validateSessionParams({ metadata: null }), /metadata/);
});

test('✅ metadata 对象（含业务字段）通过校验', () => {
    assert.strictEqual(validateSessionParams({ metadata: { orderId: 'ORDER_1', qty: 2 } }), null);
});

// ========== line_items：逐项深度校验 ==========
// 只校验 Array.isArray 等于把金额 / 商品名 / 数量完全交给调用方

const validItem = () => ({
    price_data: { currency: 'usd', unit_amount: 1999, product_data: { name: 'Pro 套餐' } },
    quantity: 2,
});

test('✅ 合法的 line_items 通过校验', () => {
    assert.strictEqual(validateSessionParams({ line_items: [validItem()] }), null);
});

test('⛔ line_items 必须是非空数组且不超过上限', () => {
    assert.match(validateSessionParams({ line_items: 'not array' }), /line_items/);
    assert.match(validateSessionParams({ line_items: [] }), /line_items/);
    assert.match(validateSessionParams({ line_items: Array(51).fill(validItem()) }), /line_items/);
});

test('⛔ line_items 每项必须是对象且 price_data 合法', () => {
    assert.match(validateSessionParams({ line_items: ['evil'] }), /line_items/);
    assert.match(validateSessionParams({ line_items: [{ quantity: 1 }] }), /line_items/);
    assert.match(validateSessionParams({ line_items: [null] }), /line_items/);
});

test('⛔ line_items 的 unit_amount 必须是正整数（负金额 / 0 元单被挡住）', () => {
    const mk = (unitAmount) => [{ ...validItem(), price_data: { ...validItem().price_data, unit_amount: unitAmount } }];
    assert.match(validateSessionParams({ line_items: mk(-1000000) }), /unit_amount/);
    assert.match(validateSessionParams({ line_items: mk(0) }), /unit_amount/);
    assert.match(validateSessionParams({ line_items: mk(19.99) }), /unit_amount/);
    assert.match(validateSessionParams({ line_items: mk('1999') }), /unit_amount/);
});

test('⛔ line_items 的 currency / quantity / product_data.name 都被校验', () => {
    const withCurrency = (currency) => [
        { ...validItem(), price_data: { ...validItem().price_data, currency } },
    ];
    assert.match(validateSessionParams({ line_items: withCurrency('dollars') }), /currency/);
    assert.match(validateSessionParams({ line_items: withCurrency(undefined) }), /currency/);

    assert.match(validateSessionParams({ line_items: [{ ...validItem(), quantity: 0 }] }), /quantity/);
    assert.match(validateSessionParams({ line_items: [{ ...validItem(), quantity: -1 }] }), /quantity/);
    assert.match(validateSessionParams({ line_items: [{ ...validItem(), quantity: 1.5 }] }), /quantity/);

    const withName = (name) => [
        { ...validItem(), price_data: { ...validItem().price_data, product_data: { name } } },
    ];
    assert.match(validateSessionParams({ line_items: withName('') }), /product_data/);
    assert.match(validateSessionParams({ line_items: withName(123) }), /product_data/);
    assert.match(validateSessionParams({ line_items: withName('x'.repeat(201)) }), /product_data/);
});

// 🚨 与 line_items 路径的 product_data.name 校验保持同一口径：
//    只判 typeof + 长度上限会放行 '' / '   '，构造出商品名为空的 order line
test('⛔ productName 拒绝空串 / 纯空格 / 超长，接受正常商品名', () => {
    assert.match(validateSessionParams({ productName: '' }), /productName/);
    assert.match(validateSessionParams({ productName: '   ' }), /productName/);
    assert.match(validateSessionParams({ productName: 'x'.repeat(201) }), /productName/);
    assert.match(validateSessionParams({ productName: 123 }), /productName/);
    assert.strictEqual(validateSessionParams({ productName: 'Pro' }), null);
});

// 🚨 不能先 String(x) 再匹配：String(['usd']) === 'usd'，数组被隐式转成合法币种
test('⛔ currency 拒绝非字符串（数组 / 数字 / 对象），接受 3 位字母', () => {
    assert.match(validateSessionParams({ currency: ['usd'] }), /currency/);
    assert.match(validateSessionParams({ currency: ['jpy'] }), /currency/);
    assert.match(validateSessionParams({ currency: ['abc'] }), /currency/);
    assert.match(validateSessionParams({ currency: { 0: 'usd' } }), /currency/);
    assert.match(validateSessionParams({ currency: 840 }), /currency/);
    assert.strictEqual(validateSessionParams({ currency: 'usd' }), null);
});

// 🚨 client_reference_id 同样不能先 String(x)：String(['ORDER_1']) === 'ORDER_1'，
//    数组 / 数字被隐式转成合法反查键，放行后原样透传给 Stripe 导致 400
test('⛔ client_reference_id 拒绝非字符串（数组 / 数字 / 对象）', () => {
    assert.match(validateSessionParams({ client_reference_id: ['ORDER_1'] }), /client_reference_id/);
    assert.match(validateSessionParams({ client_reference_id: 12345 }), /client_reference_id/);
    assert.match(validateSessionParams({ client_reference_id: { 0: 'ORDER_1' } }), /client_reference_id/);
    assert.match(validateSessionParams({ client_reference_id: { toString: () => 'ORDER_1' } }), /client_reference_id/);
    assert.strictEqual(validateSessionParams({ client_reference_id: 'ORDER_1' }), null);
});

// 🚨 customer_email 同样不能先 String(x)：String(['a@b.co']) === 'a@b.co'，
//    数组 / 自定义 toString 的对象被隐式转成合法邮箱，放行后原样透传给 Stripe 导致 400
test('⛔ customer_email 拒绝非字符串（数组 / 数字 / 对象）与非法邮箱，接受合法邮箱', () => {
    assert.match(validateSessionParams({ customer_email: ['a@b.co'] }), /customer_email/);
    assert.match(validateSessionParams({ customer_email: 123 }), /customer_email/);
    assert.match(validateSessionParams({ customer_email: { toString: () => 'a@b.co' } }), /customer_email/);
    assert.match(validateSessionParams({ customer_email: 'not-an-email' }), /customer_email/);
    assert.strictEqual(validateSessionParams({ customer_email: 'a@b.co' }), null);
});

// 🚨 line_items 内 currency 与顶层 currency 必须同口径：
//    先 String() 再匹配会放行 ['usd'] 与自定义 toString 的对象
test('⛔ line_items[].price_data.currency 拒绝非字符串（数组 / 数字 / 对象）', () => {
    const withCurrency = (currency) => [
        { ...validItem(), price_data: { ...validItem().price_data, currency } },
    ];
    assert.match(validateSessionParams({ line_items: withCurrency(['usd']) }), /currency/);
    assert.match(validateSessionParams({ line_items: withCurrency(840) }), /currency/);
    assert.match(validateSessionParams({ line_items: withCurrency({ toString: () => 'usd' }) }), /currency/);
    assert.strictEqual(validateSessionParams({ line_items: withCurrency('usd') }), null);
});

// ========== 回归：line_items 与顶层金额/数量口径互斥 ==========
// service 的 `let items = lineItems; if (!items) {...}` 会在 line_items 存在时
// 跳过整个金额构造分支：调用方声明的 amount / quantity 被静默丢弃，实际扣款
// 取自 line_items，接口仍返回 200 —— 声明金额与实收金额不一致且无告警。
test('⛔ line_items 与 amount / amount_major / quantity 只能二选一', () => {
    assert.match(validateSessionParams({ line_items: [validItem()], amount: 1000 }), /二选一/);
    assert.match(validateSessionParams({ line_items: [validItem()], amount_major: 9.9, currency: 'usd' }), /二选一/);
    assert.match(validateSessionParams({ line_items: [validItem()], quantity: 3 }), /二选一/);
    assert.strictEqual(validateSessionParams({ line_items: [validItem()] }), null, '单传 line_items 仍通过');
});

// ========== 回归：mode=setup 的互斥字段与 line_items 分支同口径 ==========
// setup 不产生扣款：service 的 _buildSessionParams 解构掉 currency / quantity 后
// items = null，body 既不含币种也不含数量 —— 调用方声明值被静默吞掉，接口仍返回 200。
// 与 line_items 分支的 currency 互斥保持一致，命中即 400。
test('⛔ mode=setup 不能传 currency / quantity（声明值不得被静默丢弃）', () => {
    assert.match(validateSessionParams({ mode: 'setup', currency: 'jpy' }), /setup/);
    assert.match(validateSessionParams({ mode: 'setup', quantity: 5 }), /setup/);
    assert.match(
        validateSessionParams({ mode: 'setup', currency: 'jpy', quantity: 5, client_reference_id: 'ORDER_1' }),
        /setup/,
        '问题描述的原始触发参数'
    );
    assert.strictEqual(
        validateSessionParams({ mode: 'setup', client_reference_id: 'ORDER_1' }),
        null,
        '不带金额 / 币种 / 数量的 setup 仍通过'
    );
});

test('⛔ mode=setup 原有互斥字段仍拒绝（amount / amount_major / line_items）', () => {
    assert.match(validateSessionParams({ mode: 'setup', amount: 990 }), /setup/);
    assert.match(validateSessionParams({ mode: 'setup', amount_major: 9.9 }), /setup/);
    assert.match(validateSessionParams({ mode: 'setup', line_items: [validItem()] }), /setup/);
});

// ========== 回归：line_items 深层字段按白名单裁剪 ==========
// 顶层 SESSION_PARAM_WHITELIST 只挡字段名，挡不住深层对象：price_data.recurring
// 把一次性 payment 变成订阅语义，adjustable_quantity 允许客户在收银台改数量，
// 都会随 params 原样透传给 stripe.checkout.sessions.create。
test('⛔ line_items 深层非白名单字段被剥离，且校验层不改写入参', () => {
    const params = {
        line_items: [{
            ...validItem(),
            adjustable_quantity: { enabled: true, minimum: 1, maximum: 9999 },
            dynamic_tax_rates: ['txr_evil'],
            price_data: {
                ...validItem().price_data,
                recurring: { interval: 'month' },
                product_data: { name: 'Pro 套餐', description: '一年' },
            },
        }],
    };

    assert.strictEqual(validateSessionParams(params), null);

    // 🚨 校验只读：不在这里改写调用方参数（否则接口 200 但下发参数已被静默改写）
    assert.strictEqual(params.line_items[0].adjustable_quantity !== undefined, true);
    assert.strictEqual(params.line_items[0].price_data.recurring.interval, 'month');

    // 净化由 service 组装请求时执行，这里验证净化结果
    const sanitized = sanitizeLineItems(params.line_items);
    const item = sanitized[0];
    assert.deepStrictEqual(Object.keys(item).sort(), ['price_data', 'quantity']);
    assert.deepStrictEqual(
        Object.keys(item.price_data).sort(),
        ['currency', 'product_data', 'recurring', 'unit_amount']
    );
    // description 是 Stripe 合法字段，必须保留（不能连带剥离）
    assert.deepStrictEqual(item.price_data.product_data, { name: 'Pro 套餐', description: '一年' });
    assert.strictEqual(item.adjustable_quantity, undefined);
    assert.strictEqual(item.dynamic_tax_rates, undefined);
    // 币种统一小写：line_items 路径不会经过 _buildSessionParams 的 toLowerCase
    assert.strictEqual(sanitizeLineItems([{ ...validItem(), price_data: { ...validItem().price_data, currency: 'USD' } }])[0].price_data.currency, 'usd');
});

// ========== 回归：validateLineItems 直连（service 可单独调用，controller 挡不住） ==========
// setup 分支必须显式表达「items 必须不存在」，而不是提前无条件 return：
// 无条件放行会让非法载荷穿过校验层，无条件拒绝会误杀合法的 setup 直连调用。

test('✅ mode=setup 且 items 缺失：校验通过（合法 setup 不传 line_items）', () => {
    assert.strictEqual(validateLineItems(undefined, { mode: 'setup' }), null);
    assert.strictEqual(validateLineItems(null, { mode: 'setup' }), null);
});

test('⛔ mode=setup 带任意 items：一律拒绝，非法载荷不得穿过校验层', () => {
    for (const bad of [
        'not array',
        { price: 'price_evil' },
        [],
        [validItem()],
        Array(51).fill(validItem()),
    ]) {
        assert.match(
            validateLineItems(bad, { mode: 'setup' }),
            /setup/,
            `非法载荷 ${String(bad)} 必须返回 setup 约束错误`
        );
    }
});

test('⛔ 非法 mode 仍先被白名单挡住，不受 setup 分支影响', () => {
    assert.match(validateLineItems(undefined, { mode: 'foo' }), /mode 只支持/);
    assert.match(validateLineItems('evil', { mode: 'PAYMENT' }), /mode 只支持/);
});

test('⛔ 非 setup 模式仍走完整形态校验（setup 分支不得提前 return）', () => {
    assert.match(validateLineItems('not array', { mode: 'payment' }), /line_items 必须是数组/);
    assert.match(validateLineItems([], { mode: 'payment' }), /不能是空数组/);
    assert.match(validateLineItems(Array(51).fill(validItem()), { mode: 'payment' }), /最多 50 项/);
    assert.strictEqual(validateLineItems([validItem()], { mode: 'payment' }), null);
});

// 🚨 subscription 走顶层金额路径时 validateLineItems 整个被跳过，
//    「订阅必须带 price_data.recurring」的约束没有任何校验 → Stripe 侧 400，
//    调用方只拿到上游原始报错。必须在 controller 层 fail closed。
test('⛔ mode=subscription 走顶层 amount / amount_major：拒绝（必须用 line_items 带 recurring）', () => {
    const base = {
        mode: 'subscription',
        currency: 'usd',
        productName: 'Plan',
        client_reference_id: 'ORDER_SUB_1',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
    };

    assert.match(
        validateSessionParams({ ...base, amount: 990 }),
        /subscription/,
        '顶层 amount 路径不产 recurring，必须拒绝'
    );
    assert.match(
        validateSessionParams({ ...base, amount_major: 9.9 }),
        /subscription/,
        '顶层 amount_major 路径同样必须拒绝'
    );
    assert.match(
        validateSessionParams({ mode: 'subscription' }),
        /subscription/,
        '不传 line_items 的订阅一律拒绝'
    );

    // 带 recurring 的 line_items 仍是合法路径
    assert.strictEqual(validateSessionParams({
        mode: 'subscription',
        client_reference_id: 'ORDER_SUB_2',
        success_url: 'https://example.com/ok?session_id={CHECKOUT_SESSION_ID}',
        line_items: [{
            price_data: {
                currency: 'usd',
                unit_amount: 990,
                product_data: { name: 'Plan' },
                recurring: { interval: 'month' },
            },
            quantity: 1,
        }],
    }), null);
});

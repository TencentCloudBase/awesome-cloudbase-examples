/**
 * line_items 的白名单校验与重建
 *
 * 为什么放在 utils 而不是 controller：
 * service（`_buildSessionParams`）也能被单独调用，controller 的校验挡不住它。
 * 校验与净化必须下沉到「真正交给 Stripe 的那一层」，两层共用同一份实现，
 * 避免出现「controller 校验了、service 直连就绕过」的口径缺口。
 *
 * ⚠️ 校验函数只读不写：不修改入参对象，重建后的对象由调用方取返回值使用。
 */

const MAX_PRODUCT_NAME_LEN = 200;
const MAX_PRODUCT_DESC_LEN = 500;
const MAX_PRODUCT_IMAGES = 8;
const MAX_LINE_ITEMS = 50;

/** Checkout 支持的 mode 白名单（controller 与 service 共用，避免 service 直连时绕过） */
const ALLOWED_MODES = ['payment', 'subscription', 'setup'];

/**
 * 金额上限（最小货币单位）
 *
 * 🚨 不设上限时 20 位数字会超过 Number.MAX_SAFE_INTEGER：精度丢失后仍是整数，
 *    Number.isInteger 判断照样通过，畸高金额直接下发 Stripe。9 位数已远超正常客单价。
 */
const MAX_AMOUNT_MINOR = 999999999;

/** 单项数量上限：unit_amount × quantity 也不能突破金额上限，且 Stripe 侧有可选数量上限 */
const MAX_QUANTITY = 999999;

/** Stripe price_data.tax_behavior 的合法取值 */
const ALLOWED_TAX_BEHAVIORS = ['inclusive', 'exclusive'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * 允许透传给 Stripe 的字段白名单
 *
 * 🚨 只挡字段名挡不住深层参数：price_data.recurring 会把一次性 payment 变成订阅语义，
 *    adjustable_quantity 允许客户在收银台自行改数量，dynamic_tax_rates 引入模板未预期税率。
 *    这里既要裁剪，也要把 Stripe 合法的常用字段显式收录（否则会被静默剥离）。
 */
const LINE_ITEM_KEYS = ['price', 'price_data', 'quantity'];
const PRICE_ID_RE = /^price_[A-Za-z0-9]{1,64}$/;
const PRICE_DATA_KEYS = ['unit_amount', 'currency', 'product_data', 'recurring', 'tax_behavior'];
// 注：不要再放 'product'。Checkout 的 price_data 里没有这个字段（引用已有价格要用
// line_items[].price），加进来只会产生「能通过白名单但永远校验不过」的不可达分支。
const PRODUCT_DATA_KEYS = ['name', 'description', 'images'];
const RECURRING_KEYS = ['interval', 'interval_count'];
const ALLOWED_INTERVALS = ['day', 'week', 'month', 'year'];

const CURRENCY_RE = /^[A-Za-z]{3}$/;

const pickKeys = (obj, keys) => {
    const out = {};
    for (const key of keys) {
        if (obj[key] !== undefined) out[key] = obj[key];
    }
    return out;
};

/**
 * 校验单个 line_item
 * @param {*} item
 * @returns {string|null} 错误信息；null = 通过
 */
function validateLineItem(item) {
    if (!isPlainObject(item)) return 'line_items 每一项必须是对象';

    // Stripe 支持两种形态：price_data（现造价格）或 price（引用已有 Price ID）。
    // 只认 price_data 会把合法的 price 形态整条拒掉。
    const hasPriceRef = item.price !== undefined;
    const hasPriceData = item.price_data !== undefined;
    if (hasPriceRef && hasPriceData) return 'line_items[].price 与 price_data 只能二选一';
    if (!hasPriceRef && !hasPriceData) {
        return 'line_items[] 必须提供 price（已有 Price ID）或 price_data';
    }

    if (hasPriceRef) {
        if (typeof item.price !== 'string' || !PRICE_ID_RE.test(item.price)) {
            return 'line_items[].price 必须是 Stripe Price ID（price_ 开头）';
        }
        // 引用已有 Price 时金额与币种由 Price 决定，这里只校验数量
        const refQty = item.quantity;
        if (typeof refQty !== 'number' || !Number.isInteger(refQty) || refQty <= 0) {
            return 'line_items[].quantity 必须是正整数';
        }
        if (refQty > MAX_QUANTITY) return `line_items[].quantity 不能超过 ${MAX_QUANTITY}`;
        return null;
    }

    const price = item.price_data;
    if (!isPlainObject(price)) return 'line_items[].price_data 必须是对象';

    // 最小货币单位：必须是正整数，负金额 / 0 元单在这里被挡住
    const unitAmount = price.unit_amount;
    if (typeof unitAmount !== 'number' || !Number.isInteger(unitAmount) || unitAmount <= 0) {
        return 'line_items[].price_data.unit_amount 必须是正整数（最小货币单位，如 999）';
    }
    if (unitAmount > MAX_AMOUNT_MINOR) {
        return `line_items[].price_data.unit_amount 不能超过 ${MAX_AMOUNT_MINOR}（最小货币单位）`;
    }

    // 与顶层 currency 同口径：先 String() 再匹配会放行 ['usd'] 与自定义 toString 的对象
    if (typeof price.currency !== 'string' || !CURRENCY_RE.test(price.currency)) {
        return 'line_items[].price_data.currency 必须是 3 位字母币种代码（如 usd）';
    }

    // product_data 可选（也可用 line_items[].price 引用已有价格，本模板不开放该形态）
    const product = price.product_data;
    if (product !== undefined) {
        if (!isPlainObject(product)
            || typeof product.name !== 'string'
            || product.name.trim() === ''
            || product.name.length > MAX_PRODUCT_NAME_LEN) {
            return `line_items[].price_data.product_data.name 必须是 1-${MAX_PRODUCT_NAME_LEN} 字符的字符串`;
        }
        if (product.description !== undefined
            && (typeof product.description !== 'string'
                || product.description.length > MAX_PRODUCT_DESC_LEN)) {
            return `line_items[].price_data.product_data.description 必须是不超过 ${MAX_PRODUCT_DESC_LEN} 字符的字符串`;
        }
        if (product.images !== undefined
            && (!Array.isArray(product.images)
                || product.images.length > MAX_PRODUCT_IMAGES
                || product.images.some(u => typeof u !== 'string' || !/^https:\/\//i.test(u)))) {
            return `line_items[].price_data.product_data.images 必须是不超过 ${MAX_PRODUCT_IMAGES} 个 https 地址的数组`;
        }
    }

    // recurring 决定是否订阅语义：间隔与间隔单位必须显式合法
    const recurring = price.recurring;
    if (recurring !== undefined) {
        if (!isPlainObject(recurring) || !ALLOWED_INTERVALS.includes(recurring.interval)) {
            return `line_items[].price_data.recurring.interval 只支持 ${ALLOWED_INTERVALS.join(' / ')}`;
        }
        if (recurring.interval_count !== undefined
            && (!Number.isInteger(recurring.interval_count) || recurring.interval_count <= 0)) {
            return 'line_items[].price_data.recurring.interval_count 必须是正整数';
        }
    }

    // tax_behavior 是 Stripe 合法字段：收录进白名单就必须校验取值，否则是「能通过校验但会被裁剪」
    if (price.tax_behavior !== undefined && !ALLOWED_TAX_BEHAVIORS.includes(price.tax_behavior)) {
        return `line_items[].price_data.tax_behavior 只支持 ${ALLOWED_TAX_BEHAVIORS.join(' / ')}`;
    }

    const quantity = item.quantity;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
        return 'line_items[].quantity 必须是正整数';
    }
    if (quantity > MAX_QUANTITY) {
        return `line_items[].quantity 不能超过 ${MAX_QUANTITY}`;
    }
    if (typeof unitAmount === 'number' && unitAmount * quantity > MAX_AMOUNT_MINOR) {
        return `line_items[].price_data.unit_amount × quantity 不能超过 ${MAX_AMOUNT_MINOR}（最小货币单位）`;
    }

    return null;
}

/**
 * 校验整个 line_items 数组（含与 mode 的组合约束）
 * @param {*} items
 * @param {Object} opts
 * @param {string} [opts.mode] 顶层 mode
 * @returns {string|null}
 */
function validateLineItems(items, opts = {}) {
    // mode 必须先过白名单：非空且不等于 'subscription' 的任意字符串（'foo' / 'PAYMENT'）
    // 都会让下面的组合约束走错分支，并原样下发给 Stripe
    if (opts.mode !== undefined && !ALLOWED_MODES.includes(opts.mode)) {
        return `mode 只支持 ${ALLOWED_MODES.join(' / ')}`;
    }

    if (!Array.isArray(items)) return 'line_items 必须是数组';
    if (items.length === 0) return 'line_items 不能是空数组';
    if (items.length > MAX_LINE_ITEMS) return `line_items 最多 ${MAX_LINE_ITEMS} 项`;

    for (const item of items) {
        const err = validateLineItem(item);
        if (err) return err;
    }

    // 订阅模式必须带 recurring，否则 Stripe 侧 400，调用方只能拿到上游原始报错
    if (opts.mode === 'subscription'
        && !items.every(i => isPlainObject(i.price_data.recurring))) {
        return 'mode=subscription 时 line_items[].price_data.recurring 必填（interval 如 month）';
    }
    if (opts.mode && opts.mode !== 'subscription'
        && items.some(i => i.price_data.recurring !== undefined)) {
        return `line_items[].price_data.recurring 只能用于 mode=subscription（当前 mode=${opts.mode}）`;
    }

    return null;
}

/**
 * 按白名单重建 line_items，并把币种统一成小写
 *
 * ⚠️ 只在校验通过后调用。返回的是新对象，不修改入参。
 * 币种小写必须在这里做：line_items 路径不会经过 _buildSessionParams 的
 * `String(currency).toLowerCase()`，否则 'USD' 会原样下发给 Stripe。
 */
function sanitizeLineItems(items) {
    return items.map((item) => {
        // 引用已有 Price 的形态：只保留 price + quantity，不构造 price_data
        if (item.price !== undefined) {
            return pickKeys(item, ['price', 'quantity']);
        }
        const price = pickKeys(item.price_data, PRICE_DATA_KEYS);

        if (price.currency !== undefined) {
            price.currency = String(price.currency).toLowerCase();
        }
        if (price.product_data !== undefined) {
            price.product_data = pickKeys(price.product_data, PRODUCT_DATA_KEYS);
        }
        if (price.recurring !== undefined) {
            price.recurring = pickKeys(price.recurring, RECURRING_KEYS);
        }

        return pickKeys({ ...item, price_data: price }, LINE_ITEM_KEYS);
    });
}

module.exports = {
    MAX_PRODUCT_NAME_LEN,
    MAX_LINE_ITEMS,
    ALLOWED_INTERVALS,
    ALLOWED_MODES,
    MAX_AMOUNT_MINOR,
    MAX_QUANTITY,
    ALLOWED_TAX_BEHAVIORS,
    validateLineItem,
    validateLineItems,
    sanitizeLineItems,
};

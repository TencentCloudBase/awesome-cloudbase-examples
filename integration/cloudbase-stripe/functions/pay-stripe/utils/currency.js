/**
 * Stripe 金额单位工具
 *
 * Stripe 的 amount / unit_amount 使用「币种最小货币单位」整数：
 *   大部分币种 ×100   $20.00 → 2000
 *   零小数币种  ×1    ¥500   → 500
 *
 * ⚠️ 零小数币种多乘 100 会直接多收 100 倍，是 Stripe 集成最常见的事故之一
 */

// 请求时 amount 与实付金额相同的币种
// 注意：UGX 虽是零小数币种，但 Stripe 向后兼容要求按两位表示，故刻意不列入
const ZERO_DECIMAL = new Set([
    'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
    'PYG', 'RWF', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * 主货币单位 → Stripe 最小货币单位
 * @param {number} amount - 主单位金额，如 20.00
 * @param {string} currency - 三字母币种，如 'usd'
 * @returns {number} 最小货币单位整数
 */
function toMinorUnits(amount, currency) {
    const c = String(currency || '').toUpperCase();
    return Math.round(amount * (ZERO_DECIMAL.has(c) ? 1 : 100));
}

/**
 * Stripe 最小货币单位 → 主货币单位（展示/对账用）
 * @param {number} minor - 最小货币单位整数
 * @param {string} currency - 三字母币种
 * @returns {number}
 */
function fromMinorUnits(minor, currency) {
    const c = String(currency || '').toUpperCase();
    return minor / (ZERO_DECIMAL.has(c) ? 1 : 100);
}

/**
 * 币种是否为零小数币种
 * @param {string} currency
 * @returns {boolean}
 */
function isZeroDecimal(currency) {
    return ZERO_DECIMAL.has(String(currency || '').toUpperCase());
}

module.exports = { toMinorUnits, fromMinorUnits, isZeroDecimal, ZERO_DECIMAL };

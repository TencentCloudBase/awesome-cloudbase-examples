/**
 * 虚拟支付签名服务
 *
 * 与普通微信支付的根本差异：
 * - 普通支付：后端调统一下单接口，微信返回 prepay_id
 * - 虚拟支付：后端「自己构造 signData 并计算双签名」，客户端拿去拉起收银台
 *
 * 两套签名：
 *   paySig     = HMAC-SHA256(uri & signData, AppKey)      —— 商户侧身份
 *   signature  = HMAC-SHA256(signData, sessionKey)        —— 用户态签名
 *
 * ⚠️⚠️ 头号坑：signData 必须按「原样字符串」参与签名
 *     一旦经过 JSON.parse → JSON.stringify，键顺序可能被重排、空格被改写，
 *     签名立即失效（官方文档把「验签失败」直接归因于此）。
 *     本文件所有签名入口都接收「字符串」而非对象，就是为了避免这个坑。
 */
const crypto = require('crypto');
const { getAppKey } = require('../config/config');

// 道具直购 / 代币充值的固定 mode
const MODE = {
    GOODS: 'short_series_goods',
    COIN: 'short_series_coin',
};

// C 端下单时 paySig 的 uri 固定值
const CLIENT_PAY_URI = 'requestVirtualPayment';

/**
 * HMAC-SHA256，输出 hex
 * @param {string|Buffer} key
 * @param {string} data
 * @returns {string}
 */
function hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');
}

/**
 * 构造 signData 字符串
 *
 * 键顺序按官方示例固定，不做任何重排。
 * 调用方拿到的是字符串，后续签名与返回前端都用这同一个字符串。
 *
 * @param {Object} params
 * @param {string} params.offerId
 * @param {number} params.buyQuantity - 购买数量（代币充值时即代币数量）
 * @param {number} params.env - 固定 0（现网）。协议必填字段，模板不支持沙箱
 * @param {string} [params.productId] - 道具 ID（道具直购必填，须与后台一致）
 * @param {number} [params.goodsPrice] - 道具单价，单位「分」（道具直购必填，须与后台一致）
 * @param {string} params.outTradeNo - 业务单号，8-32 位
 * @param {string} [params.attach] - 透传数据，发货推送时原样返回
 * @param {string} [params.mode] - 默认道具直购
 * @returns {string} signData 原样 JSON 字符串
 */
function buildSignData(params) {
    const {
        offerId,
        buyQuantity = 1,
        env = 0,
        productId,
        goodsPrice,
        outTradeNo,
        attach,
        mode = MODE.GOODS,
    } = params;

    // ⚠️ Number('abc') → NaN，而 JSON.stringify 会把 NaN 静默序列化成 null，
    //    签出来的基串字段值畸形却不报错，最后表现为「签名校验失败」，根因极难定位
    const qty = Number(buyQuantity);
    if (!Number.isInteger(qty) || qty <= 0) {
        throw new Error(`buyQuantity 非法：${buyQuantity}（必须是正整数）`);
    }
    const envValue = Number(env);
    if (envValue !== 0 && envValue !== 1) {
        throw new Error(`env 非法：${env}（只能是 0 现网 / 1 沙箱）`);
    }

    // 按固定顺序插入，保证 JSON.stringify 输出稳定
    const obj = {};
    obj.offerId = offerId;
    obj.buyQuantity = qty;
    obj.env = envValue;
    obj.currencyType = 'CNY';

    // mode 白名单：非法值会让下面的 GOODS 分支被跳过，
    // productId / goodsPrice 静默丢失 → 签出一份字段缺失的基串
    if (mode !== MODE.GOODS && mode !== MODE.COIN) {
        throw new Error(`mode 非法：${mode}（只能是 ${MODE.GOODS} / ${MODE.COIN}）`);
    }

    // 道具直购需要 productId + goodsPrice；代币充值不需要
    if (mode === MODE.GOODS) {
        if (typeof productId !== 'string' || !productId.trim()) {
            throw new Error('productId 非法：道具直购必须传 productId（须与后台一致）');
        }
        obj.productId = productId;
        if (goodsPrice !== undefined && goodsPrice !== null) {
            // ⚠️ Number('') / Number('  ') / Number(false) / Number([]) 全是 0，
            //    只判 price < 0 会让这些值当成合法 0 分价格写进签名基串，
            //    签出一笔 0 元道具订单。必须先卡类型与空串，再判范围
            const isNumeric = typeof goodsPrice === 'number'
                || (typeof goodsPrice === 'string' && goodsPrice.trim() !== '');
            if (!isNumeric) {
                throw new Error(`goodsPrice 类型非法：${JSON.stringify(goodsPrice)}（必须是正整数，单位：分）`);
            }
            const price = Number(goodsPrice);
            if (!Number.isInteger(price) || price <= 0) {
                throw new Error(`goodsPrice 非法：${goodsPrice}（必须是正整数，单位：分）`);
            }
            obj.goodsPrice = price;
        }
    }

    obj.outTradeNo = outTradeNo;

    // 官方口径：attach 是必填字段，发货推送会原样透传。
    // 调用方不传时用业务单号兜底，保证字段始终存在（空值/缺字段都可能被平台判为参数错误）。
    obj.attach = attach || outTradeNo || '';

    return JSON.stringify(obj);
}

/**
 * 生成业务单号 outTradeNo
 * 官方约束：8-32 位、全局唯一、不能以下划线开头
 * @param {string} [prefix]
 * @returns {string}
 */
function generateOutTradeNo(prefix = 'X') {
    const ts = Date.now().toString();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${ts}${rand}`.slice(0, 32);
}

/**
 * 校验业务单号合法性
 * @param {string} outTradeNo
 * @returns {string|null} 错误信息，合法返回 null
 */
function validateOutTradeNo(outTradeNo) {
    if (typeof outTradeNo !== 'string' || outTradeNo.length < 8 || outTradeNo.length > 32) {
        return `outTradeNo 长度须为 8-32 位（当前 ${outTradeNo ? outTradeNo.length : 0}）`;
    }
    if (outTradeNo.startsWith('_')) {
        return 'outTradeNo 不能以下划线开头';
    }
    // 官方要求：只能由数字、大小写字母与 _-|*@ 组成。
    // 不做字符集白名单的话，空格 / 中文 / #& 都能通过本地校验，
    // 直到请求打到微信侧才报参数错误 —— 会被误判成签名或密钥问题
    if (!/^[0-9A-Za-z_\-|*@]{8,32}$/.test(outTradeNo)) {
        return 'outTradeNo 只能由数字、大小写字母、_-|*@ 组成（8-32 位）';
    }
    return null;
}

/**
 * C 端下单签名：返回客户端拉起支付所需的 payData
 *
 * @param {string} signData - 原样字符串（由 buildSignData 生成，不要重新序列化）
 * @param {string} sessionKey - code2Session 换取的会话密钥
 * @param {string} [mode] - 道具直购 / 代币充值
 * @returns {{ signData: string, mode: string, paySig: string, signature: string }}
 */
function signForClient(signData, sessionKey, mode = MODE.GOODS) {
    if (!sessionKey) throw new Error('缺少 sessionKey，无法计算 signature');

    // ⚠️ AppKey 与 sessionKey 同等关键：空密钥也能「成功」算出一个 sig，
    //    结果是所有请求验签失败，但错误信息完全不指向「AppKey 未配置」
    const appKey = getAppKey();
    if (!appKey) throw new Error('缺少 AppKey，无法计算 paySig');

    const paySig = hmacSha256(appKey, `${CLIENT_PAY_URI}&${signData}`);
    const signature = hmacSha256(sessionKey, signData);

    return { signData, mode, paySig, signature };
}

/**
 * B 端调用 /xpay/* 服务端接口的签名
 *
 * 与 C 端的区别：paySig 的 uri 换成实际接口路径（如 /xpay/query_order），
 * signature 仍然是对 post_body 签。
 *
 * @param {string} uri - 接口路径，如 '/xpay/query_order'
 * @param {string} postBody - 原样请求体字符串
 * @param {string} sessionKey
 * @returns {{ signature: string, paySig: string }}
 */
function signForServer(uri, postBody, sessionKey) {
    if (!sessionKey) throw new Error('缺少 sessionKey，无法计算 signature');

    const appKey = getAppKey();
    if (!appKey) throw new Error('缺少 AppKey，无法计算 paySig');

    return {
        signature: hmacSha256(sessionKey, postBody),
        paySig: hmacSha256(appKey, `${uri}&${postBody}`),
    };
}

module.exports = {
    MODE,
    CLIENT_PAY_URI,
    hmacSha256,
    buildSignData,
    generateOutTradeNo,
    validateOutTradeNo,
    signForClient,
    signForServer,
};

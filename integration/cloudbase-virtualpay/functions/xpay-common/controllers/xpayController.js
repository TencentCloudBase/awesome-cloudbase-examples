/**
 * 虚拟支付控制器
 * 处理路由请求，调用 xpayService，返回统一格式
 */
const XpayService = require('../services/xpayService');
const { xpayConfig, isProduction } = require('../config/config');
const { getOpenId, getAppId } = require('../utils/cloudbaseAuth');
const { parsePayload } = require('../utils/xml');

const xpayService = new XpayService();

// ========== 应答体字面量 ==========
// ⚠️ 应答格式必须与推送格式一致，写错会导致微信重推最多 15 次。
// 因此这里用官方文档给出的字面量，不做任何动态拼装，避免加工环节引入偏差。
const CALLBACK_SUCCESS_XML = '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>';
const CALLBACK_RETRY_XML = '<xml><ErrCode>-1</ErrCode><ErrMsg><![CDATA[internal error]]></ErrMsg></xml>';

// 生产判定与 app.js 共用 config.isProduction()：
// 部署侧不设 NODE_ENV，两边各写一套会让「脱敏」在生产环境失效
const isProd = isProduction;

// ========== 统一响应格式（业务接口）==========

function success(res, data) {
    res.status(200).json({ code: 0, msg: 'success', data });
}

/**
 * 业务失败统一出口
 *
 * ⚠️ 默认返回 **HTTP 200**，错误语义放在 body 的 code / msg 里。
 * 原因：`wx.cloud.callHTTPFunction` 对非 2xx 的响应**不会把 body 交给前端**，
 * fail 回调里只有 `cloud.callHttpFunction:fail system error. code: 400` ——
 * 真正的原因（如「/xpay/query_order 失败 (268490002): 数据不存在」）会被吞掉，
 * 排查时极容易被误导成「网络/鉴权问题」。
 *
 * 需要真实 HTTP 状态码的场景（如给网关/监控用）显式传 statusCode。
 */
function fail(res, msg, statusCode = 200) {
    res.status(statusCode).json({ code: -1, msg, data: null });
}

/**
 * 内部异常统一出口
 * 日志记录完整错误；响应体在生产环境脱敏，避免泄露内部地址、堆栈等信息
 */
function failInternal(res, err, fallback) {
    console.error('[Controller] error:', err);
    fail(res, isProd() ? fallback : (err.message || fallback));
}

// ========== 正向下单 ==========

/**
 * 下单：返回 payData 供前端 wx.requestVirtualPayment 拉起收银台
 *
 * 入参：code（wx.login 获取）、productId、goodsPrice、buyQuantity、mode、attach
 */
exports.createOrder = async (req, res) => {
    try {
        const params = { ...req.body };

        // 平台注入的小程序 AppID（wx.cloud.callHTTPFunction 会带 x-wx-appid）。
        // 用 header 覆盖客户端可能传入的值 —— appId 决定用哪个小程序身份换 sessionKey。
        params.appId = getAppId(req) || '';

        // 未传 code 时，若平台已注入 openid 仍需 sessionKey 才能算 signature，
        // 因此 code 是必填项（前端 wx.login 获取）
        if (!params.code) {
            return fail(res, '缺少 code：前端需先调用 wx.login() 并将 code 传入');
        }

        // 🔒 入参白名单：这些字段会直接进入 signData 参与签名，
        //    非法值不会报错，而是签出一份「看起来正常但不符预期」的订单
        const invalid = validateCreateParams(params);
        if (invalid) return fail(res, invalid);

        const result = await xpayService.createOrder(params);
        success(res, result);
    } catch (err) {
        failInternal(res, err, '下单失败');
    }
};

/** 下单入参白名单校验，返回错误文案或 null */
function validateCreateParams(params) {
    const { mode, buyQuantity, productId, goodsPrice, outTradeNo } = params;

    if (mode !== undefined && mode !== 'goods' && mode !== 'coin') {
        return 'mode 只能是 goods 或 coin';
    }

    const qty = Number(buyQuantity === undefined ? 1 : buyQuantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        return 'buyQuantity 必须是 1-100 的整数';
    }
    params.buyQuantity = qty;

    const isCoin = mode === 'coin';
    if (!isCoin) {
        if (typeof productId !== 'string' || !productId.trim() || productId.length > 64) {
            return 'productId 必填，且长度不超过 64';
        }
        const price = Number(goodsPrice);
        if (!Number.isInteger(price) || price <= 0) {
            return 'goodsPrice 必须是正整数（单位：分）';
        }
    }

    if (outTradeNo !== undefined) {
        if (typeof outTradeNo !== 'string' || !/^[0-9A-Za-z_\-|*@]{8,32}$/.test(outTradeNo)) {
            return 'outTradeNo 只能由数字、大小写字母、_-|*@ 组成（8-32 位）';
        }
    }

    return null;
}

/**
 * 查单（兜底发货用）
 * 前端 success 回调可能丢失（用户异常退出），发货以推送为主、查单兜底
 */
exports.queryOrder = async (req, res) => {
    try {
        const { code, outTradeNo } = req.body || {};
        if (!outTradeNo) return fail(res, '缺少 outTradeNo');
        if (typeof outTradeNo !== 'string' || !/^[0-9A-Za-z_\-|*@]{8,32}$/.test(outTradeNo)) {
            return fail(res, 'outTradeNo 只能由数字、大小写字母、_-|*@ 组成（8-32 位）');
        }
        if (!code) return fail(res, '缺少 code：查单需要 sessionKey 计算签名');

        const openid = getOpenId(req);
        if (!openid) {
            return fail(res, '无法识别用户身份（缺少平台注入的 x-wx-openid）');
        }

        // 分层与 createOrder 一致：换 sessionKey / 取权威 openid 都在 service 内
        const result = await xpayService.queryOrder({
            code,
            outTradeNo,
            openId: openid,
            appId: getAppId(req) || xpayConfig.appId,
        });

        success(res, result);
    } catch (err) {
        // 401 身份不一致 / 403 订单不属于当前用户：都是调用方问题，原样返回
        if (err && (err.status === 401 || err.status === 403)) {
            return fail(res, err.message, err.status);
        }
        failInternal(res, err, '查单失败');
    }
};

// ========== 异步回调 ==========

/**
 * 判断应答格式：**只跟随请求本身**，不依赖任何配置
 *
 * 1. content-type 带 xml / json → 直接照办（正常链路，平台推送一定带头）
 * 2. 没有 content-type（少见）→ 看请求体是不是 <xml 开头
 * 3. 都没有 → 默认 JSON
 *
 * ⚠️ 应答格式必须与推送格式一致，否则平台会重推最多 15 次。
 *    这件事由请求自己说明，不需要再配一个 notifyFormat（已删除）。
 */
function isXmlRequest(req) {
    const ct = req.headers['content-type'] || '';
    if (/xml/i.test(ct)) return true;
    if (/json/i.test(ct)) return false;

    const raw = req.rawBody ? String(req.rawBody) : '';
    return raw.trimStart().startsWith('<xml');
}

/**
 * 构造 XML 成功应答
 *
 * ⚠️ 不能直接返回固定字面量：iOS 退款问询的决策凭据（IosRefundQueryResponse）
 *    必须随应答带回，否则微信侧拿不到 result_code，会把「已判定不退款」当成无应答处理。
 *    XML 与 JSON 两条通道必须承载同一份语义。
 * @param {Object} payload
 * @returns {string}
 */
function buildSuccessXml(payload) {
    const extra = payload.IosRefundQueryResponse;
    if (!extra || typeof extra !== 'object') return CALLBACK_SUCCESS_XML;

    const fields = Object.entries(extra)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `<${k}><![CDATA[${String(v).replace(/]]>/g, ']]]]><![CDATA[>')}]]></${k}>`)
        .join('');

    return '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg>'
        + `<IosRefundQueryResponse>${fields}</IosRefundQueryResponse></xml>`;
}

/**
 * 发送回调应答
 * @param {Object} payload - JSON 应答体
 */
function sendCallbackResponse(req, res, payload) {
    if (isXmlRequest(req)) {
        const xml = payload.ErrCode === 0 ? buildSuccessXml(payload) : CALLBACK_RETRY_XML;
        res.type('application/xml').send(xml);
    } else {
        res.status(200).json(payload);
    }
}

/** 构造成功应答（iOS 退款问询需附带决策凭据） */
function buildSuccessPayload(result) {
    const resp = { ErrCode: 0, ErrMsg: 'success' };
    if (result?.iosRefundQueryResponse) {
        resp.IosRefundQueryResponse = result.iosRefundQueryResponse;
    }
    return resp;
}

/**
 * 虚拟支付回调（无鉴权，由网关验签解密后转发明文）
 *
 * ⚠️ 应答策略（错误分级）：
 *   - 结构性错误（缺 Event 字段）→ 回 ErrCode=0，重推也不会变好，避免无效重推
 *   - 业务异常（发货失败、下游超时）→ 回 ErrCode≠0，触发微信指数退避重推（最多 15 次）
 *
 *   反过来做（所有错误都回 0）会静默丢单；所有错误都回非 0 则会无效重推刷屏。
 *
 * ⚠️ 其他约束：
 *   1. 应答体格式必须与推送格式一致
 *   2. 耗时操作（发货、外部 API）要异步化，不要阻塞应答
 *   3. iOS 退款问询须在 3 秒内应答（建议判断逻辑 1 秒内完成）
 */
exports.callback = async (req, res) => {
    // 🚨 第二道闸：不接受未验签的投递。
    //    路由 /xpay/callback 是公开挂载的，app.js 的「未验签禁止投递」守卫在
    //    云 API 适配层（只覆盖 _action / body.path 形态）；直连 HTTP 的
    //    POST /xpay/callback 不经过它，所以这里必须自己再判一次。
    if (!req.pushVerified) {
        console.error('[Controller] 拒绝未验签的回调投递');
        return res.status(401).json({ code: -1, msg: 'unverified callback' });
    }

    try {
        // 未加密推送时 express.text() 收到字符串，需转为对象；
        // 已解密推送时 app.js 已转成对象。parsePayload 两种形态都认（XML / JSON）。
        const body = parsePayload(req.body);

        console.log('[Controller] 收到回调:', {
            event: body?.Event || body?.event
                || body?.ParsedContent?.Event || body?.ParsedNotify?.Event,
            has_parsed_content: !!body?.ParsedContent,
            has_parsed_notify: !!body?.ParsedNotify,
        });

        const result = await xpayService.handleCallback(body);
        sendCallbackResponse(req, res, buildSuccessPayload(result));
    } catch (err) {
        console.error('[Controller] callback error:', err);

        if (err && err.nonRetryable) {
            // 重推无意义的结构性错误：回成功，防止 15 次无效重推
            return sendCallbackResponse(req, res, { ErrCode: 0, ErrMsg: 'success' });
        }

        // 其他错误视为可重试：回非 0，让微信按指数退避重推
        sendCallbackResponse(req, res, { ErrCode: -1, ErrMsg: 'internal error' });
    }
};

// ========== 鉴权 ==========
//
// 不做内置鉴权中间件。模板的信任前提是「函数只经 callHTTPFunction /
// 集成中心网关调用」，此前提下 openid 由平台头提供；而在公网直连场景下，
// 任何「宽松放行」的中间件都不产生实际保护，只会让人误以为有鉴权。
//
// ⚠️ 注意：**`x-wx-openid` 非空不构成鉴权** —— 该头没有签名，公网直连时
//    客户端可以自己塞一行别人的 openid。真正的约束在业务代码里：
//
//   1. 下单/查单都强制要求 `code`：它是 wx.login 签发的一次性凭证，
//      攻击者拿不到受害者的 code，也就走不到下游查单
//   2. `code2Session` 换出的**权威 openid** 必须与请求头 openid 一致，
//      不一致直接 401（见 xpayService.queryOrder）
//   3. 查单还要校验**订单归属**：只允许查自己下的单，否则 403
//      （见 checkOrderOwnership）
//   4. `signature` / `paySig` 的密钥是 sessionKey，只能由 secret + code 换出，
//      伪造请求签不出合法签名
//
// 服务端 / 第三方调用：Bearer 一律不采信（无法验签），身份只认平台注入的 x-wx-openid；
// getOpenId 才会从 JWT 的 provider_sub 取身份（默认关闭，因为 payload 可伪造）。
// 开启前提是该环境的云函数只经云 API 网关暴露。
//
// 需要公网直连时，请在上游（API 网关 / 云托管）完成身份校验 ——
// 函数内不提供「宽松/收紧」式开关，避免被误配成「看起来有保护」。

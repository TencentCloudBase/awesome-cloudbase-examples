/**
 * 虚拟支付控制器
 * 处理路由请求，调用 xpayService，返回统一格式
 */
const XpayService = require('../services/xpayService');
const { xpayConfig } = require('../config/config');
const {
    parseCloudBaseAuth, getOpenId, getAppId, getPlatformOpenId, isStrictAuth,
} = require('../utils/cloudbaseAuth');
const { parsePayload } = require('../utils/xml');

const xpayService = new XpayService();

// ========== 应答体字面量 ==========
// ⚠️ 应答格式必须与推送格式一致，写错会导致微信重推最多 15 次。
// 因此这里用官方文档给出的字面量，不做任何动态拼装，避免加工环节引入偏差。
const CALLBACK_SUCCESS_XML = '<xml><ErrCode>0</ErrCode><ErrMsg><![CDATA[success]]></ErrMsg></xml>';
const CALLBACK_RETRY_XML = '<xml><ErrCode>-1</ErrCode><ErrMsg><![CDATA[internal error]]></ErrMsg></xml>';

const isProd = () => process.env.NODE_ENV === 'production';

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
        if (err && err.status === 401) {
            return fail(res, err.message, 401);
        }
        failInternal(res, err, '查单失败');
    }
};

// ========== 异步回调 ==========

/**
 * 判断应答格式
 * ⚠️ 以「实际推送格式」为准（content-type），notifyFormat 仅作兜底。
 */
function isXmlRequest(req) {
    const ct = req.headers['content-type'] || '';
    if (/xml/i.test(ct)) return true;
    if (/json/i.test(ct)) return false;
    return xpayConfig.notifyFormat === 'xml';
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
    try {
        // 未加密推送时 express.text() 收到字符串，需转为对象；
        // 已解密推送时 app.js 已转成对象。parsePayload 两种形态都认（XML / JSON）。
        const body = parsePayload(req.body);

        console.log('[Controller] 收到回调:', {
            event: body?.Event || body?.event || body?.ParsedContent?.Event,
            has_parsed_content: !!body?.ParsedContent,
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

// ========== 鉴权中间件 ==========

/**
 * 鉴权中间件（回调路由不挂，由网关验签保证可信）
 *
 * 🚨 信任模型（务必理解后再上线）：
 * 模板默认「信任上游」——认为 HTTP 云函数平台网关 / 集成中心网关已完成鉴权。
 * 这是必要假设：`SCF_RUNTIME`、`TENCENTCLOUD_RUNENV` 等运行时环境变量在云函数内**恒存在**，
 * 无法用来判断「本次请求是否真的经过了网关」；而 `x-tcb-integration-id` 一类
 * 自定义 header 是客户端可任意伪造的，绝不能作为鉴权依据。
 *
 * 若云函数会被直接暴露到公网，请设置：
 *     requireCallerAuth=true
 * 此时**不再采信裸的 x-wx-openid**（客户端可以自己塞一行同名头伪造身份），
 * 只放行「显式开启 trustUnverifiedJwt 后的 JWT」。
 * 若部署层能保证网关覆盖客户端同名头，可再显式设置 trustPlatformHeaders=true。
 */
exports.payMiddleware = (req, res, next) => {
    const strict = isStrictAuth();

    // 1) 平台注入的用户身份：格式合法且当前信任级别允许采信
    if (getPlatformOpenId(req)) {
        return next();
    }

    // 2) 可信 JWT：payload 未验签，仅在显式开启信任时才采信
    const authInfo = parseCloudBaseAuth(req);
    if (authInfo) {
        req.cloudbaseAuth = authInfo;
        return next();
    }

    // 3) 默认宽容：信任上游网关（requireCallerAuth=true 时关闭该分支）
    if (!strict) {
        return next();
    }

    console.warn('[Auth] 收紧模式拒绝匿名调用:', req.path);
    res.status(401).json({ code: -1, msg: '未授权访问' });
};

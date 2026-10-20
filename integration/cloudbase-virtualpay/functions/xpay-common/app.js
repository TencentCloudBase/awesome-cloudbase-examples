const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const { validateConfig, isProduction } = require('./config/config');

const app = express();

// ⚠️ 显式固定运行环境：不设 NODE_ENV 时 Express 默认 'development'，
//    会让下面的错误处理器把内部异常消息回传给调用方。默认按 production 处理。
//    判定口径与 controller 共用 isProduction()，避免两处漂移。
app.set('env', isProduction() ? 'production' : 'development');

// 启动时校验配置（只告警不阻断）
validateConfig();

// 不启用 CORS：调用方是小程序（wx.cloud.callHTTPFunction），不走浏览器同源策略。
// 若确有 Web 端直接调用需求，请在上游网关配置跨域，而不是在函数里放开。
app.use(logger('dev'));

// 虚拟支付回调走小程序消息推送，格式可能是 JSON 或 XML（取决于集成登记）
// JSON → 对象；XML → 原样字符串（由 controller 用 utils/xml.js 解析）
//
// verify 钩子保留原始字节到 req.rawBody —— 预留给「需要对整个 body 验签」的场景。
// ⚠️ express.json() 解析后原始字节就拿不回来了，而 JSON.parse → stringify
//    会重排键顺序，任何基于原文的签名都会失效，所以必须在解析时就留一份。
//    本模板的微信验签只用到 query 参数 + <Encrypt> 字段，暂未消费 rawBody。
const keepRawBody = (req, res, buf) => { req.rawBody = buf; };

app.use(express.json({ verify: keepRawBody }));
// 非 JSON 一律按字符串收（微信推送的 Content-Type 不固定：text/xml、application/xml，偶发不带）
app.use(express.text({ type: (req) => !req.is('application/json'), verify: keepRawBody }));

// JSON 解析失败时回落成原始字符串，不要直接 400：
// 微信推送的 Content-Type 不可信（可能标 application/json 而实际是 XML），
// express.json 会先把它当 JSON 解析并抛 entity.parse.failed，
// 报文在进入验签中间件之前就被拒 → 「报文合法却被解析层静默丢弃」= 丢单。
// keepRawBody 已经把原始字节留在 req.rawBody，这里直接用它重填 req.body。
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed' && req.rawBody) {
        console.warn('[Body] JSON 解析失败，按原始字符串继续处理:', err.message);
        req.body = req.rawBody.toString('utf8');
        return next();
    }
    return next(err);
});

// ========== 自建回调（集成中心未上线 / 直连 HTTP 访问服务）==========
// 没有网关代验签时，下面两步必须自己完成，否则：
//   ① 后台保存回调 URL 直接失败（GET echostr 校验不过）
//   ② 安全模式下收到的是 <Encrypt> 密文，解析不出 Event
const { handleUrlVerify, extractEncrypt, verifySignature, decrypt } = require('./utils/wechatCrypto');
const { parsePayload } = require('./utils/xml');
const { getCallbackConfig, xpayConfig } = require('./config/config');

const MSG_TOKEN = () => process.env.token || '';
const MSG_AES_KEY = () => process.env.msgSecret || '';

/** 需要 msgSecret 的加密方式 */
const NEEDS_AES = new Set(['aes', 'compatible']);

/**
 * 从推送报文里取 Event（唯一入口，避免多处识别范围不一致）
 *
 * 覆盖四种形态：
 *   XML 字符串             → <Event>...</Event>
 *   JSON 顶层              → Event / event
 *   网关包装（微信支付风格）→ ParsedContent.Event
 *   网关包装（平台风格）    → ParsedNotify.Event
 *
 * ⚠️ 之前「验签拦截」「兼容模式回退」「云 API 适配」三处各写了一套识别逻辑，
 *    范围互不相同：拦截用的最窄（只认顶层 Event），导致 JSON 无签名推送能绕过；
 *    回退用的最窄，导致 ParsedContent 形态明明可用却被判成解密失败。统一到这里。
 * @param {string|Object} body
 * @returns {string|null}
 */
function pickEvent(body) {
    if (typeof body === 'string') {
        const m = /<(?:Event|event)>(?:<!\[CDATA\[)?([\w.]+)/.exec(body);
        return m ? m[1] : null;
    }
    if (!body || typeof body !== 'object') return null;
    return body.Event || body.event
        || body.ParsedNotify?.Event || body.ParsedNotify?.event
        || body.ParsedContent?.Event || body.ParsedContent?.event
        || null;
}

/** body 里是否已有可直接使用的明文字段（明文推送 / 兼容模式） */
function hasPlainEvent(body) {
    return !!pickEvent(body);
}

/**
 * 本函数是否负责验签
 *
 * 平台声明优先（notifyUrlCallbackType）：
 *   ownservice → 用户自定义回调地址，必须自己验签
 *   system     → 系统内置回调地址，网关已代验签
 *   未注入     → **fail closed，按「自己验签」处理**
 *
 * 🚨 未声明时绝不能用「token 没配 = 网关代验签」去猜：
 *    漏配 token 是常见误操作，猜错的代价是任何人都能 POST 一段 JSON 伪造发货。
 *    要免验签必须在平台上明确声明 notifyUrlCallbackType=system。
 * @param {ReturnType<typeof getCallbackConfig>} cb
 * @returns {boolean}
 */
function isSelfVerify(cb) {
    if (cb.type === 'system') return false;
    return true;
}

// 启动自检：把平台声明与最终判定都打出来，不用猜
(function logCallbackMode() {
    const cb = getCallbackConfig();
    const selfVerify = isSelfVerify(cb);
    const tokenLen = cb.token.length;
    const keyLen = cb.aesKey.length;
    const na = '(未注入)';

    console.info('[Callback] 声明: '
        + `type=${cb.type || na} resource=${cb.resource || na} encrypt=${cb.encryptType || na}`
        + ` | token=${tokenLen ? '已配' : '未配'} msgSecret=${keyLen ? keyLen + ' 位' : '未配'}`);
    console.info(`[Callback] 判定: ${selfVerify ? '本函数验签' : '网关代验签'}`
        + `${keyLen === 43 ? ' + 可解密' : ' + 不解密'}`);

    const warnings = [];
    if (selfVerify && NEEDS_AES.has(cb.encryptType) && keyLen !== 43) {
        warnings.push(`msgEncryptType=${cb.encryptType} 需要 msgSecret（43 位），`
            + `当前 ${keyLen ? keyLen + ' 位' : '未配置'} → 安全模式解密必失败`);
    }
    if (cb.type === 'system' && tokenLen) {
        warnings.push('notifyUrlCallbackType=system（网关代验签）却配置了 token，'
            + '可能重复验签；网关若改写了 signature，本函数会误判 401，建议删除 token');
    }
    if (cb.type === 'ownservice' && !tokenLen) {
        warnings.push('notifyUrlCallbackType=ownservice（自建回调）却未配置 token，推送无法验签');
    }
    if (cb.resource === 'cloudrun') {
        warnings.push('notifyUrlResourceType=cloudrun：回调打到云托管，这个云函数收不到推送');
    }
    warnings.forEach((w) => console.warn('⚠️ [Callback]', w));
})();

// ① 微信 URL 校验：GET ?signature=&timestamp=&nonce=&echostr=
//    任意路径都接 —— HTTP 访问服务可能给 URL 加路径前缀（如 /xpay-demo）
app.get('*', (req, res, next) => {
    if (!req.query.echostr) return next();

    const result = handleUrlVerify({
        token: MSG_TOKEN(),
        encodingAESKey: MSG_AES_KEY(),
        query: req.query,
        // 与解密同一份 appId 口径：echostr 密文尾部也带 appId，需一并校验
        appId: xpayConfig.appId,
    });

    if (!result.ok) {
        console.error('[Callback] URL 校验失败:', result.reason);
        return res.status(401).send('invalid signature');
    }

    console.info('[Callback] URL 校验通过');
    return res.status(200).send(result.echo);
});

// ② 来源认证 + 安全模式解密
//
// 微信两种推送模式都带 signature（明文与安全模式都有），安全模式另有 msg_signature：
//   明文：?signature=&timestamp=&nonce=
//   安全：?signature=&timestamp=&nonce=&encrypt_type=aes&msg_signature=
// 只验 msg_signature 是不够的 —— 不加密的推送没有 Encrypt，会直接越过验签，
// 任何人都能 POST 一段 XML 伪造 xpay_goods_deliver_notify 触发发货。
//
// 「谁负责验签」优先看平台声明 notifyUrlCallbackType，读不到才退回 token 启发式：
//   ownservice → 本函数验签：带签名必验，无签名的 XML 直接拒绝
//   system     → 网关代验签：明文放行，仅做密文兜底解密
//   未注入     → 看 token 是否配置（兼容老集成）
app.use((req, res, next) => {
    if (req.method !== 'POST') return next();

    const cb = getCallbackConfig();
    const selfVerify = isSelfVerify(cb);
    const { signature, msg_signature: msgSignature, timestamp, nonce } = req.query;
    const encrypt = extractEncrypt(req.body);
    const eventType = pickEvent(req.body);

    // 只有「本函数负责验签」时才做本地校验：
    // 网关代验签（system）模式下 token 通常是空的，此时带 signature 的请求
    // 若仍强制本地验签必然失败，与下面 pushVerified 的判定口径自相矛盾
    if (selfVerify && signature && !verifySignature({ token: cb.token, timestamp, nonce, signature })) {
        console.error('[Callback] signature 校验失败：Token 与微信后台是否一致？'
            + '（若回调已由集成中心网关代验签，请删环境变量 token 并声明 notifyUrlCallbackType=system）');
        return res.status(401).json({ code: -1, msg: 'invalid signature' });
    }

    // 微信推送一定带 signature。凡是「带业务事件 / 带密文」却没有 signature 的请求，
    // 一律拒绝 —— 不再依赖 body 是 XML 还是 JSON（旧实现只在 XML 时拦截，
    // 攻击者把 Content-Type 换成 application/json 就绕过了验签）。
    //
    // 🚨 msg_signature 不能替代 signature：它只在**密文**分支有意义（签名串含 Encrypt），
    //    明文分支从不校验它。旧条件写成「signature 与 msg_signature 都缺才拒绝」，
    //    于是 ?msg_signature=<任意值> + 明文报文就整条绕过验签 → 可伪造发货事件。
    if (selfVerify && !signature && (eventType || encrypt)) {
        console.error('[Callback] 收到无 signature 的推送，已拒绝'
            + '（msg_signature 只能用于密文；若回调已由集成中心网关代验签，'
            + '请声明 notifyUrlCallbackType=system）');
        return res.status(401).json({ code: -1, msg: 'missing signature' });
    }

    if (!encrypt) {
        // 明文模式：
        //   自验签 → 只有「签名存在且已通过」才算可信推送；业务调用（无事件）不置标记
        //   网关代验签 → 平台声明 system，信任上游，标记为已验签
        req.pushVerified = selfVerify ? !!signature : true;
        return next();
    }

    if (cb.encryptType === 'plaintext') {
        console.warn('[Callback] 声明 msgEncryptType=plaintext 却收到密文，'
            + '按安全模式处理（检查微信后台「消息加密方式」）');
    }

    // 安全模式：msg_signature 的签名串包含 Encrypt
    if (!verifySignature({ token: cb.token, timestamp, nonce, encrypt, signature: msgSignature })) {
        console.error('[Callback] msg_signature 校验失败（Token 与后台是否一致？）');
        return res.status(401).json({ code: -1, msg: 'invalid msg_signature' });
    }

    try {
        // appId 取值口径与 config 保持一致（键名有 appId/appid/APP_ID 等变体，
        // 这里读 process.env.appId 会漏掉变体 → 解密时的 appId 绑定校验被静默跳过）
        const plain = decrypt(encrypt, cb.aesKey, xpayConfig.appId || '');
        // ⚠️ 明文形态由后台「数据格式」决定：XML→XML、JSON→JSON。
        //    一律按 XML 解析会让 JSON 明文变成空对象 → 取不到 Event → 根路径 404。
        req.body = parsePayload(plain);
        req.pushVerified = true;
        console.info('[Callback] 安全模式密文已解密 | Event=', pickEvent(req.body) || '(未识别)');
        return next();
    } catch (err) {
        // 兼容模式：微信同时下发了明文字段与密文，解密失败不该丢单 —— 回退用明文
        if (cb.encryptType === 'compatible' && hasPlainEvent(req.body)) {
            console.warn('[Callback] 兼容模式解密失败，回退使用明文字段:', err.message);
            req.pushVerified = true;
            return next();
        }
        console.error('[Callback] 解密失败:', err.message);
        return res.status(400).json({ code: -1, msg: 'decrypt failed' });
    }
});

// 虚拟支付路由
const xpayRouter = require('./routes/xpay');
app.use('/xpay', xpayRouter);

// ========== 云 API 网关适配 ==========
// 云 API 调用 HTTP 云函数时，Express 收到的 path 为 /，业务路由通过 body._action 传递
//
// 🔒 这里的输入全部来自外部请求体，必须「先白名单再路由」：
//    旧实现先按 includes('/xpay/') 截取任意后缀、拼接成 xpay_xxx 后再查白名单，
//    导致任意 /xpay/xxx 都被归一化投递到免鉴权的 /callback。
const ALLOWED_ACTIONS = new Set(['create_order', 'query_order', 'callback']);
const PATH_ACTION_RE = /^\/xpay\/(create_order|query_order|callback)$/;

app.use((req, res, next) => {
    const body = req.body;
    const isObject = !!body && typeof body === 'object';

    // 类型先校验：_action / path 可能是数字、对象等非字符串值，
    // 直接调 includes/split 会抛 TypeError → 500，掩盖真实的参数错误
    if (isObject && body._action !== undefined && typeof body._action !== 'string') {
        return res.status(400).json({ code: -1, msg: '非法 action 类型' });
    }
    if (isObject && body.path !== undefined && typeof body.path !== 'string') {
        return res.status(400).json({ code: -1, msg: '非法 path 类型' });
    }

    const action = isObject ? body._action : undefined;
    const bodyPath = isObject ? body.path : undefined;

    let actionName = null;

    if (action) {
        // 容错：create_order / xpay_create_order / /xpay/create_order 三种写法都接受，
        // 但归一化后的名字必须命中白名单，否则直接拒绝
        const tail = action.includes('/xpay/') ? action.split('/xpay/').pop() : action;
        actionName = tail.replace(/^xpay_/, '');
        if (!ALLOWED_ACTIONS.has(actionName)) {
            return res.status(400).json({ code: -1, msg: '不支持的操作: ' + tail });
        }
        delete body._action;
    } else if (bodyPath) {
        // 严格全匹配：不做前缀截取，避免任意后缀被投递到 callback
        const m = PATH_ACTION_RE.exec(bodyPath);
        if (!m) {
            return res.status(400).json({ code: -1, msg: '不支持的 path: ' + bodyPath });
        }
        actionName = m[1];
        delete body.path;
        delete body.method;
    } else {
        const eventType = pickEvent(body);
        if (eventType && typeof eventType === 'string' && eventType.startsWith('xpay_')) {
            // 所有 xpay_* 事件统一投递到 /callback，由 xpayService 内部按 Event 分发
            actionName = 'callback';
            console.info('[Xpay] 事件路由映射:', eventType, '→ callback');
        }
    }

    // 🚨 统一守卫：不论 actionName 来自 _action、body.path 还是 Event 推断，
    //    只要目标是 /callback（该路由不挂鉴权中间件），就必须「已通过验签」。
    //    旧实现只在 Event 分支校验，攻击者改用 {"_action":"callback"} 即可绕过。
    if (actionName === 'callback' && !req.pushVerified) {
        console.error('[Xpay] 拒绝投递到 /callback：请求未通过验签');
        return res.status(401).json({ code: -1, msg: 'unverified event' });
    }

    if (actionName) {
        console.info('[云API适配] 路由分发:', '/' + actionName);
        // 保留原 query string，避免改写 req.url 时丢失
        const qIdx = (req.url || '').indexOf('?');
        const qs = qIdx >= 0 ? req.url.slice(qIdx) : '';
        req.url = '/' + actionName + qs;
        req.method = 'POST';
        return xpayRouter(req, res, next);
    }

    next();
});

// catch 404
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
// 4xx 与 5xx 分开：4xx 是调用方问题，直接告知；5xx 只在开发环境回传内部消息
app.use(function (err, req, res, next) {
    const status = err.status || err.statusCode || 500;

    if (status >= 400 && status < 500) {
        return res.status(status).json({
            code: -1,
            msg: status === 404 ? '接口不存在' : (err.message || '请求不合法'),
        });
    }

    res.status(status).json({
        code: -1,
        msg: req.app.get('env') === 'development' ? err.message : '服务内部错误',
    });
});

module.exports = app;

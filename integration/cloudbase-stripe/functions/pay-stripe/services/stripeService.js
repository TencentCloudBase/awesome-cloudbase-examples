/**
 * Stripe 服务（策略入口）
 *
 * 主动请求（创建 Session / 查询 / 退款）永远走 SDK 用 sk 直连 Stripe
 * 回调处理只有一条路径：本函数用 stripe-signature 自验签
 */
const { stripeConfig } = require('../config/config');
const StripeStrategy = require('./strategies/stripeStrategy');
const { toMinorUnits } = require('../utils/currency');
const {
    MAX_PRODUCT_NAME_LEN,
    MAX_AMOUNT_MINOR,
    ALLOWED_MODES,
    validateLineItems,
    sanitizeLineItems,
} = require('../utils/lineItems');

/**
 * 十进制字面量守卫（与 controller 的 isNumberLike 同口径）
 *
 * 🚨 service 是公开导出的，可被脚本/二期入口单独调用 —— 不能假设一定先过了 controller。
 *    只用 Number() 隐式转型挡不住 true / [5] / '0x10' / '1e3'：
 *    Number(true)===1、Number([5])===5、Number('0x10')===16、Number('1e3')===1000，
 *    都会静默变成合法金额，直接造成资损。
 */
const DECIMAL_LITERAL_RE = /^\d+(\.\d{1,2})?$/;
const isDecimalLiteral = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) && DECIMAL_LITERAL_RE.test(String(v));
    if (typeof v === 'string') return DECIMAL_LITERAL_RE.test(v.trim());
    return false;
};
const toDecimalNumber = (v, name) => {
    if (!isDecimalLiteral(v)) {
        throw new Error(`${name} 必须是十进制数字（不接受布尔 / 数组 / 十六进制 / 科学计数法）`);
    }
    return Number(v);
};

/** 普通对象判定：与 controllers/stripeController.js 的 isPlainObject 同一约定 */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** 非空字符串判定 */
const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

/**
 * 进程内幂等集合的容量上限
 * Set 无 TTL、多实例不共享、冷启动会整批丢失；这里至少挡住无界增长，
 * 生产环境仍应替换为 event_id + type 唯一索引（去重写入与业务落库同一事务）。
 */
const MAX_PROCESSED_EVENTS = 5000;

/**
 * Stripe 事件类型 → 业务语义映射
 * 一期重点关注前两个；其余预留给二期（退款/争议）
 */
const EVENT_SEMANTICS = {
    'checkout.session.completed': { biz: 'order', state: 'PAID' },
    'checkout.session.expired': { biz: 'order', state: 'EXPIRED' },
    'payment_intent.succeeded': { biz: 'order', state: 'PAID' },
    'payment_intent.payment_failed': { biz: 'order', state: 'FAILED' },
    'charge.refunded': { biz: 'refund', state: 'REFUNDED' },
    'charge.dispute.created': { biz: 'dispute', state: 'DISPUTED' },
};

/**
 * Checkout Session 的「资金到账」判定
 *
 * 🚨 checkout.session.completed 只代表「会话完成」，不等于「已收款」：
 *    异步支付方式（SEPA debit / bank transfer）下 status=complete 时
 *    payment_status 仍可能是 unpaid。EVENT_SEMANTICS 是事件级默认语义，
 *    实际能否映射 PAID 必须单独看 payment_status === 'paid'。
 */
const CHECKOUT_PAID_PAYMENT_STATUS = 'paid';
const STATE_PENDING_PAYMENT = 'PENDING';



/**
 * payment_intent.payment_failed 允许的 PaymentIntent 状态
 *
 * 只排除 'succeeded' 不够：requires_action / requires_capture 等未终态也会被判成
 * 终态 FAILED 并写入去重键，后续真实状态变化无法再进入。
 */
const PAYMENT_FAILED_STATUSES = [
    'requires_payment_method',
    'requires_confirmation',
    'requires_action',
    'requires_capture',
    'canceled',
];

class StripeService {
    constructor() {
        this.strategy = new StripeStrategy(stripeConfig);

        // ⚠️ 幂等集合：Stripe 不保证只投递一次，也不保证顺序
        // 示例用内存 Set，生产环境请替换为数据库唯一索引（event_id 建唯一键）
        this.processedEvents = new Set();

        console.log('[StripeService] 回调验签: 本函数自验签（constructEvent）');
    }

    // ========== 正向下单 ==========

    /**
     * 创建 Checkout Session
     * 支持两种入参：
     *   1) 直接传 line_items（Stripe 原生结构）
     *   2) 传 amount + currency + productName（模板自动转最小货币单位并构造 line_items）
     *
     * @param {Object} params
     * @returns {Object} { sessionId, url, ... }
     */
    async createSession(params) {
        const body = this._buildSessionParams(params);

        const session = await this.strategy.createSession(body);

        console.info('[StripeService] Session 创建成功:', session.id);

        return {
            sessionId: session.id,
            url: session.url,
            // 嵌入式收银台（二期）需要 client_secret
            clientSecret: session.client_secret || null,
            status: session.status,
            paymentStatus: session.payment_status,
            // 业务侧可拿 expires_at 做倒计时
            expiresAt: session.expires_at,
            // 🚨 不回传 raw：与 retrieveSession 同口径。整包 Stripe 对象会把
            //    customer_details / payment_method 等客户信息一并带给前端。
        };
    }

    /**
     * 构造 Stripe create 参数（处理金额单位 + 跳转地址兜底）
     */
    _buildSessionParams(p) {
        const {
            line_items: lineItems,
            amount,
            amount_major: amountMajor,
            currency = 'usd',
            productName = 'Order',
            quantity = 1,
            mode = 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: clientRefId,
            metadata = {},
            customer_email: customerEmail,
            ...rest
        } = p;

        // service 可被单独调用：mode 白名单必须在这里再挡一次，
        // 否则 'foo' / 'PAYMENT' 会原样下发给 Stripe 且只拿到上游 400
        if (!ALLOWED_MODES.includes(mode)) {
            throw new Error(`mode 只支持 ${ALLOWED_MODES.join(' / ')}`);
        }

        // currency 同样兜底：非字符串（如 ['jpy']）会被 String() 隐式转成合法币种
        if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
            throw new Error('currency 必须是 3 位字母币种代码（如 usd）');
        }

        // setup 模式只收集支付方式、不产生扣款：Stripe 不接受金额与 line_items。
        // 模式白名单里有 setup，但原实现会走到下面的金额分支必然抛「缺少金额」，
        // 等于每条 setup 请求都失败在中途。
        if (mode === 'setup') {
            if (lineItems !== undefined || amount !== undefined || amountMajor !== undefined) {
                throw new Error('mode=setup 不能传 line_items / amount / amount_major（setup 只收集支付方式，不扣款）');
            }
        }

        let items = lineItems;
        if (mode === 'setup') {
            items = null;
        } else if (!items) {
            const hasAmount = amount !== undefined && amount !== null;
            const hasMajor = amountMajor !== undefined && amountMajor !== null;
            if (hasAmount && hasMajor) {
                throw new Error('amount（最小货币单位）与 amount_major（主单位）只能传一个');
            }
            if (!hasAmount && !hasMajor) {
                throw new Error('缺少金额：请传 amount（最小货币单位）或 amount_major（主单位）或 line_items');
            }
            // 兜底归一化：controller 已在入口拒绝字符串 quantity，但 service 也可被单独调用。
            // 绝不能把字符串 quantity 原样交给 checkout.sessions.create（Stripe 侧类型不符返回 400）。
            const normalizedQuantity = toDecimalNumber(quantity, 'quantity');
            if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
                throw new Error('quantity 必须是正整数');
            }
            if (typeof productName !== 'string'
                || productName.trim() === ''
                || productName.length > MAX_PRODUCT_NAME_LEN) {
                throw new Error(`productName 必须是 1-${MAX_PRODUCT_NAME_LEN} 字符的非空字符串`);
            }
            // amount 本身就是最小货币单位，直接使用；amount_major 才需要换算
            // （零小数币种不乘 100）。两种口径混用会让金额差 100 倍，必须显式区分。
            const unitAmount = hasMajor
                ? toMinorUnits(toDecimalNumber(amountMajor, 'amount_major'), currency)
                : toDecimalNumber(amount, 'amount');
            if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
                throw new Error('金额必须是最小货币单位的正整数（如 9.90 美元传 990）');
            }
            if (unitAmount > MAX_AMOUNT_MINOR) {
                throw new Error(`金额不能超过 ${MAX_AMOUNT_MINOR}（最小货币单位），过大的整数会丢精度`);
            }
            items = [
                {
                    price_data: {
                        currency: String(currency).toLowerCase(),
                        unit_amount: unitAmount,
                        product_data: { name: productName },
                    },
                    quantity: normalizedQuantity,
                },
            ];
        } else {
            // 🚨 line_items 直连分支同样要校验：service 可被单独调用，不能依赖
            //    「调用方一定先走了 controller」。金额 / 数量 / 币种 / 商品名一项都不能少。
            const itemError = validateLineItems(items, { mode });
            if (itemError) throw new Error(itemError);
            // 按白名单重建并把币种统一小写（line_items 路径不经过上面的 toLowerCase）
            items = sanitizeLineItems(items);
        }

        const finalSuccessUrl = successUrl || stripeConfig.successUrl;
        const finalCancelUrl = cancelUrl || stripeConfig.cancelUrl;

        // hosted 收银台的三种 mode 都需要 success_url：payment 支付完成、
        // subscription 首次订阅完成、setup 保存支付方式完成都要回跳。
        // 只在 payment 校验时，subscription / setup 会一路打到 Stripe 才拿到上游 400。
        if (!finalSuccessUrl) {
            throw new Error(`缺少 success_url：mode=${mode} 的托管收银台必填（可由环境变量 stripeSuccessUrl 兜底）`);
        }

        // service 公开导出，可被脚本 / 二期入口单独调用，不能假设一定先过了
        // controller 的 typeof 校验。非字符串真值（1 / {} / ['x']）会让下面的
        // includes 抛 TypeError，controller 又会把该 message 原样透给调用方。
        if (typeof finalSuccessUrl !== 'string') {
            throw new Error('success_url 必须是字符串');
        }

        // 回跳拿不到 session_id 的原因 90% 在这里：Stripe 只有见到 success_url 里的
        // {CHECKOUT_SESSION_ID} 占位符，才会把它替换成 ?session_id=cs_xxx 回跳。
        // 这里只告警不阻断 —— 占位符不是 Stripe API 的必填项。
        // 保留真值短路：告警分支无论如何都不能让请求因类型问题崩溃。
        if (finalSuccessUrl && !finalSuccessUrl.includes('{CHECKOUT_SESSION_ID}')) {
            console.warn(
                '[StripeService] ⚠️ success_url 缺少 {CHECKOUT_SESSION_ID} 占位符，'
                + '支付完成后回跳不会带 session_id，业务页无法反查支付结果'
            );
        }

        const body = {
            mode,
            client_reference_id: clientRefId,
            metadata,
            ...rest,
        };

        // setup 模式没有 line_items，且不能传空数组（Stripe 会判非法参数）
        if (items && items.length > 0) body.line_items = items;

        if (finalSuccessUrl) body.success_url = finalSuccessUrl;
        if (finalCancelUrl) body.cancel_url = finalCancelUrl;
        if (customerEmail) body.customer_email = customerEmail;

        return body;
    }

    /**
     * 查询 Session 状态
     * @param {string} sessionId
     */
    async retrieveSession(sessionId) {
        if (!sessionId) throw new Error('缺少 sessionId');

        const session = await this.strategy.retrieveSession(sessionId);

        return {
            sessionId: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
            // 对账用：等价于微信支付的 out_trade_no
            clientReferenceId: session.client_reference_id,
            amountTotal: session.amount_total,
            currency: session.currency,
            raw: session,
        };
    }

    /**
     * 发起退款
     *
     * 归属与支付状态都在这里校验：service 是公开导出的，不能假设一定先过了 controller。
     * 不传 amount = 退剩余全部（Stripe 的默认语义），传了则必须是正整数且不超过原支付金额。
     *
     * ⚠️ 退款结果以 Webhook `charge.refunded` 为最终凭据：接口返回 succeeded 只代表
     *    Stripe 已受理，异步退款方式（银行转账等）到账前状态仍可能变化。
     *
     * @param {Object} params
     * @param {string} params.sessionId
     * @param {number} [params.amount] - 最小货币单位；不传 = 全额
     * @param {string} [params.reason] - duplicate / fraudulent / requested_by_customer
     * @param {string} [params.idempotencyKey]
     * @param {string} params.ownerUid - 当前登录 uid（来自网关注入的身份）
     * @returns {Object} 精简后的退款结果（不回传 raw）
     */
    async createRefund({ sessionId, amount, reason, idempotencyKey, ownerUid }) {
        if (!sessionId) throw new Error('缺少 sessionId');

        const session = await this.strategy.retrieveSession(sessionId);

        // 资源级鉴权：session_id 会出现在回跳地址 / 浏览器历史 / 日志里，
        // 只判「已登录」等于允许任何人拿别人的 id 发起退款。
        // 归属以服务端下单时写入的 metadata.cloudbaseUid 为准（客户端改不了），
        // 不一致统一 404，避免把接口当成 session_id 存在性探测通道。
        const owner = session?.metadata?.cloudbaseUid;
        if (!ownerUid || typeof owner !== 'string' || owner !== ownerUid) {
            const err = new Error('未找到该 Session');
            err.status = 404;
            throw err;
        }

        // 未收款不能退：unpaid / processing 一律拒绝，避免对「钱还没到」的单发起退款
        if (session.payment_status !== 'paid') {
            const err = new Error('该 Session 尚未支付，无法退款');
            err.status = 400;
            throw err;
        }

        const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id;
        if (!paymentIntentId) {
            const err = new Error('该 Session 缺少 payment_intent，无法退款');
            err.status = 400;
            throw err;
        }

        if (!Number.isInteger(session.amount_total) || session.amount_total <= 0) {
            const err = new Error('该 Session 没有可退金额');
            err.status = 400;
            throw err;
        }

        // amount 不传时交给 Stripe 退剩余全部；传了就先本地挡住明显超额，
        // 让调用方拿到明确提示，而不是 Stripe 的 400
        if (amount !== undefined && amount > session.amount_total) {
            const err = new Error(`退款金额不能超过原支付金额 ${session.amount_total}（最小货币单位）`);
            err.status = 400;
            throw err;
        }

        const refund = await this.strategy.createRefund({
            payment_intent: paymentIntentId,
            // 不传 amount = 全额（含多次部分退款后的剩余）
            ...(amount !== undefined ? { amount } : {}),
            ...(reason ? { reason } : {}),
            // 回调与对账都按这两个字段回到用户与订单维度
            metadata: { cloudbaseUid: ownerUid, sessionId },
        }, idempotencyKey);

        console.info('[StripeService] 退款已受理:', refund.id, 'session:', sessionId);

        return {
            refundId: refund.id,
            status: refund.status,
            amount: refund.amount,
            currency: refund.currency,
            paymentIntentId,
            sessionId,
            // 🚨 不回传 raw：与 createSession / retrieveSession 同口径
        };
    }

    // ========== 异步回调 ==========

    /**
     * 事件结构校验：必须是「像 Stripe 事件」的对象，而不是调用方可控的任意 JSON
     *
     * 明文通道（网关代验签）里，body 的内容由调用方完全控制，只校验 event.type
     * 存在是不够的 —— 少一个字段校验，伪造报文就能一路走到「打标 PAID」。
     * 这里做最小字段白名单：id（非空字符串）+ type（非空字符串）+ data.object（对象）。
     *
     * ⚠️ 结构合法还不够：data.object 内部的业务主键由 _isValidBizObject 按业务语义
     *    单独校验，避免「空对象 {}」被打标成 PAID 后透传给业务侧却无法反查订单。
     *
     * @param {*} event
     * @returns {boolean}
     */
    _isValidEvent(event) {
        // 三处结构判断统一用 isPlainObject：曾经 event / event.data 都排除了数组，
        // 唯独 data.object 漏掉 —— `typeof [] === 'object'` 会让
        // {"data":{"object":[]}} 通过校验，畸形数据一路走到落库环节
        if (!isPlainObject(event)) return false;
        if (typeof event.id !== 'string' || event.id.trim() === '') return false;
        if (typeof event.type !== 'string' || event.type.trim() === '') return false;
        if (!isPlainObject(event.data)) return false;
        if (!isPlainObject(event.data.object)) return false;
        return true;
    }

    /**
     * 业务字段校验：按事件类型要求 data.object 的最小业务主键（fail closed）
     *
     * 只校验容器类型时，`data: { object: {} }` 会被当作结构完整的事件一路走到
     * 「打标 PAID」，但业务侧拿不到 client_reference_id，既无法反查订单，
     * 也无法区分「结构合法但业务字段缺失」与正常事件。
     *
     * ⚠️ 刻意不枚举 status / payment_status 的取值：Stripe 状态值随 API 版本演进，
     *    写死白名单会把合法的新状态误判成伪造事件。这里只要求「字段存在且非空」，
     *    是否映射 PAID 由 handleWebhook 单独按 payment_status === 'paid' 判定。
     *
     * @param {Object} event - 已通过 _isValidEvent 的事件
     * @returns {boolean}
     */
    _isValidBizObject(event) {
        const obj = event.data.object;
        const eventType = event.type;

        // 所有 Stripe 资源对象都带 id：空对象 {} 到这里必须被挡住
        if (!isNonEmptyString(obj.id)) return false;

        if (eventType.startsWith('checkout.session.')) {
            // 业务侧用 client_reference_id 反查本地订单（见落库 TODO），缺失即无法落库
            if (!isNonEmptyString(obj.client_reference_id)) return false;

            // 🚨 status 只做结构性非空校验：它是「会话级」状态（complete / expired），
            //    绝不能拿它当「资金到账」依据。异步支付方式下 status=complete 与
            //    payment_status=unpaid 会同时出现，曾用 `payment_status ?? status`
            //    合并取值把 unpaid 当成有效状态放行，最终把未收款事件打标 PAID。
            //    与下方 payment_status 同为无条件非空（fail closed）：不能写
            //    `obj.status !== undefined && ...`，否则字段缺失时短路放行，
            //    事件会被打标 PAID、占用去重键并回 200，Stripe 不再重试。
            if (!isNonEmptyString(obj.status)) return false;

            // payment_status 必须存在且非空：资金是否到账由它决定
            if (!isNonEmptyString(obj.payment_status)) return false;
            return true;
        }

        if (eventType.startsWith('payment_intent.')) {
            // PaymentIntent 对象没有 client_reference_id，靠自身 id 关联订单
            if (!isNonEmptyString(obj.status)) return false;

            // 🚨 event.type 与 object.status 必须双向自洽：
            //    - succeeded 要求 status=succeeded（挡住「成功事件 + 失败状态」）
            //    - payment_failed 要求 status 落在失败态集合（只排除 succeeded 不够，
            //      requires_action 这类未终态会被误打成终态 FAILED）
            const intentStatus = obj.status.trim().toLowerCase();
            if (eventType === 'payment_intent.succeeded') return intentStatus === 'succeeded';
            if (eventType === 'payment_intent.payment_failed') {
                return PAYMENT_FAILED_STATUSES.includes(intentStatus);
            }
            return false;
        }

        // refund / dispute 的对象结构不同（Charge vs Dispute），必须分别校验
        if (eventType === 'charge.refunded') {
            // Charge 对象：能关联回原支付，且确实发生过退款
            const linked = isNonEmptyString(obj.payment_intent) || isNonEmptyString(obj.charge);
            const refunded = obj.refunded === true
                || (typeof obj.amount_refunded === 'number' && obj.amount_refunded > 0);
            return linked && refunded;
        }

        if (eventType === 'charge.dispute.created') {
            // Dispute 对象：必须有争议金额、争议状态与关联支付，缺一不可
            const linked = isNonEmptyString(obj.charge) || isNonEmptyString(obj.payment_intent);
            const hasAmount = typeof obj.amount === 'number' && obj.amount > 0;
            return linked && hasAmount && isNonEmptyString(obj.status);
        }

        // 未覆盖的事件类型一律 fail closed：新增订阅事件必须同时补上校验分支
        return false;
    }

    /**
     * 记录去重键（容量上限保护，避免进程内 Set 无界增长）
     * @param {string} key - event.id + type 组合键
     */
    _markProcessed(key) {
        if (this.processedEvents.size >= MAX_PROCESSED_EVENTS) {
            const oldest = this.processedEvents.values().next().value;
            this.processedEvents.delete(oldest);
        }
        this.processedEvents.add(key);
    }

    /**
     * Webhook 回调统一处理
     *
     * 判定顺序（只有一条路：验签）：
     *   ① 缺少 stripe-signature → 直接拒绝（控制器回 4xx）
     *   ② 缺少 rawBody          → 直接拒绝
     *   ③ constructEvent 验签   → 失败拒绝 / 成功继续
     *
     * 🚨 不采信任何「网关明文」（ParsedContent / ParsedNotify）：
     *    stripe-pay 集成实测不做网关代验签 —— 无签名请求也会被直接转发到函数，
     *    转发的仍是 Stripe 原始报文。此时再信任明文，等于开放一个免签名的
     *    「把订单标成 PAID」后门。notifyURLCallbackType=system 在本模板不生效。
     *
     * 🚨 也绝不整包采信顶层 body。
     *
     * 🚨 没有 `signMode` 这类「默认不验签」的开关：默认值不是 gateway，
     *    漏配环境变量 = 空串 ≠ system = 自验签，属安全侧失败。
     *
     * @param {Object} callbackParams - { rawBody, signature }
     * @returns {Object|null} 解析出的事件对象；验签失败 / 明文不合法返回 null
     */
    async handleWebhook(callbackParams) {
        const { rawBody, signature } = callbackParams;

        let event;
        // 是否经过本函数侧的密码学验签（false = 仅凭平台声明采信明文）
        let verified = false;

        // 🚨 只认 Stripe 签名：stripe-pay 不做网关代验签，任何「明文可信」分支
        //    都等于给伪造回调留后门（实测无签名请求也能直接打到函数）。
        if (!signature) {
            console.error(
                '[StripeService] 缺少 stripe-signature，拒绝（本函数自验签，不采信任何明文）'
            );
            return null;
        }
        if (!rawBody) {
            console.error('[StripeService] 有 stripe-signature 但缺少 rawBody，无法验签');
            return null;
        }
        try {
            event = this.strategy.verifyWebhook(rawBody, signature);
            verified = true;
            console.info('[StripeService] 自验签通过, event:', event.id);
        } catch (err) {
            console.error('[StripeService] 验签失败:', err.message);
            return null;
        }

        // 结构校验：id / type / data.object 缺一不可（幂等与业务落库都依赖这些字段）
        if (!this._isValidEvent(event)) {
            console.error(
                '[StripeService] 回调报文结构不合法（缺少 event.id / event.type / event.data.object 之一），拒绝'
            );
            return null;
        }

        // 先确认事件语义：未订阅类型直接忽略，且不占用去重键。
        // 🚨 曾在语义判定之前就把 event.id 写进幂等集合：明文通道下请求方只要
        //    先投递一条同 id 的未订阅 / 低价值事件，后续真实支付成功事件就会被
        //    判成重复、订单永远停在未支付态。
        const semantic = EVENT_SEMANTICS[event.type];
        if (!semantic) {
            console.info('[StripeService] 未订阅的事件类型，忽略:', event.type);
            return { verified, ignored: true, eventId: event.id, type: event.type };
        }

        // 业务字段校验（fail closed）：缺业务主键的报文既不能被打标 PAID，
        // 也不能占用去重键，否则「校验通过却没有可用业务主键」的状态会一路
        // 透传到业务落库环节。
        if (!this._isValidBizObject(event)) {
            console.error(
                '[StripeService] 回调事件缺少必要业务字段（data.object.id / 反查主键 / 状态），拒绝（fail closed）'
            );
            return null;
        }

        // 🚨 EVENT_SEMANTICS 是「事件级默认语义」，checkout.session.completed
        //    不等于已收款：只有 payment_status === 'paid' 才允许映射 PAID；
        //    unpaid / processing / no_payment_required 一律降级为 PENDING，
        //    业务侧不得按 PAID 发货 / 开通权益。
        // TODO(业务侧)：订阅 checkout.session.async_payment_succeeded，异步支付
        //    方式资金到账后由该事件把订单从 PENDING 推进到 PAID。
        let state = semantic.state;
        if (event.type.startsWith('checkout.session.') && state === 'PAID') {
            // 🚨 先归一化再比较：'PAID' / ' paid ' 这类大小写、空白差异不该把
            //    已收款事件判成 PENDING（资金已到账却不发货），也不能因为没归一化
            //    把未知状态误当成 paid。未知值一律降级（fail closed）。
            const rawPaymentStatus = event.data.object.payment_status;
            const paymentStatus = typeof rawPaymentStatus === 'string'
                ? rawPaymentStatus.trim().toLowerCase()
                : '';

            if (paymentStatus !== CHECKOUT_PAID_PAYMENT_STATUS) {
                state = STATE_PENDING_PAYMENT;
                console.warn(
                    '[StripeService] ⚠️ ' + event.type + ' 但 payment_status='
                    + JSON.stringify(rawPaymentStatus) + '，未确认收款，状态降级为 ' + state
                );
            }
        }

        // 显式给出「是否可交付」：调用方不必自己拿 state 字符串和 PAID 比对，
        // 也避免 PENDING 被当成失败态静默丢弃（资金已到账但订单不推进）
        const deliverable = state === 'PAID';

        // 去重键 = event.id + type：明文通道由请求方控制，组合键可避免一次
        // 低价值事件把同 id 的真实事件吞掉（原实现只用 event.id 单键）。
        const dedupeKey = `${event.id}:${event.type}`;
        if (this.processedEvents.has(dedupeKey)) {
            console.warn('[StripeService] 重复事件已忽略:', dedupeKey);
            return { verified, duplicated: true, eventId: event.id, type: event.type };
        }

        console.info(`[StripeService] 事件 ${event.type} → ${semantic.biz}/${state}`);

        // TODO(业务侧)：在此对接自己的订单表
        //   1. 用 event.data.object.client_reference_id 找到本地订单
        //   2. 更新订单状态为 state（非 PAID 不发货）
        //   3. 发货 / 开通权益
        //
        // ⚠️ 生产环境把「去重写入」与「业务落库」放进同一事务（event_id + type
        //    唯一索引），落库成功才提交去重键；落库失败不占位，让 Stripe 重试
        //    能重新进入。当前模板无真实落库，故在构造出业务结果之后再记录。
        this._markProcessed(dedupeKey);

        return {
            verified,
            duplicated: false,
            eventId: event.id,
            type: event.type,
            biz: semantic.biz,
            state,
            deliverable,
            data: event.data?.object,
        };
    }
}

module.exports = StripeService;
module.exports.EVENT_SEMANTICS = EVENT_SEMANTICS;
// PENDING 是运行时可能返回的状态，必须随模块导出，避免调用方拿到未声明的魔法字符串
module.exports.STATE_PENDING_PAYMENT = STATE_PENDING_PAYMENT;

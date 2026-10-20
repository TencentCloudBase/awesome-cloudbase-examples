/**
 * 虚拟支付服务（策略入口）
 *
 * 两条链路：
 *   正向下单：构造 signData → 双签名 → 返回 payData 给客户端拉起收银台（纯本地计算，不下单）
 *   异步回调：网关已验签解密的明文 → 按 Event 分发 → 幂等发货 / 回收
 *
 * ⚠️ 与普通支付最大的不同：服务端「不参与下单」。
 *    微信支付是服务端调统一下单拿 prepay_id；
 *    虚拟支付是客户端 wx.requestVirtualPayment 自行完成下单与收银台拉起，
 *    服务端只负责出签名。
 */
const { env, xpayConfig, envSummary } = require('../config/config');
const {
    MODE,
    buildSignData,
    signForClient,
    generateOutTradeNo,
    validateOutTradeNo,
} = require('./signService');
const XpayStrategy = require('./strategies/xpayStrategy');
const { code2Session } = require('../utils/wechatApi');

// 内存追踪容量上限（示例实现，生产必须落库；上限仅用于防止热实例无界增长）
const MAX_TRACKED_EVENTS = 5000;
const MAX_TRACKED_ORDERS = 5000;

/**
 * 「权益已发放」的订单状态集合
 *
 * iOS 退款问询据此判断是否拦截。新增状态时必须同步加进来，
 * 否则该状态下的订单会被判为「未发货」→ 建议退款 → 重复资损。
 */
const ENTITLEMENT_GRANTED_STATES = new Set(['DELIVERED', 'COIN_PAID', 'REFUNDED']);

/**
 * 6 类回调事件 → 业务语义
 * 与微信支付普通回调（TRANSACTION.SUCCESS 等）完全不同，走的是小程序消息推送通道
 */
const XPAY_EVENTS = {
    xpay_goods_deliver_notify: {
        biz: 'deliver',
        desc: '道具发货（核心事件）',
        idempotent: true,
    },
    xpay_coin_pay_notify: { biz: 'coin', desc: '代币支付', idempotent: true },
    xpay_refund_notify: { biz: 'refund', desc: '退款（回收道具）', idempotent: true },
    xpay_complaint_notify: { biz: 'complaint', desc: '用户投诉（人工跟进）', idempotent: false },
    xpay_wxpay_callback_notify: { biz: 'risk', desc: '风控事件', idempotent: false },
    xpay_subscribe_ios_refund_query_notify: {
        biz: 'iosRefundQuery',
        desc: 'iOS 退款问询（3 秒内应答）',
        idempotent: false,
        quickResponse: true,
    },
};

class XpayService {
    constructor() {
        this.strategy = new XpayStrategy();

        // ⚠️ 幂等集合：微信会重推最多 15 次（指数退避）
        // 示例用内存 Set，生产环境请替换为数据库 OutTradeNo 唯一索引
        this.processedEvents = new Set();
        this.orders = new Map();
    }

    // ========== 正向下单 ==========

    /**
     * 下单：生成业务单号 + 构造 signData + 双签名
     *
     * @param {Object} params
     * @param {string} params.code - 前端 wx.login() 获取的 code（换 sessionKey）
     * @param {string} [params.outTradeNo] - 业务单号，不传则自动生成
     * @param {string} [params.productId] - 道具 ID（道具直购必填，须与后台一致）
     * @param {number} [params.goodsPrice] - 道具单价，单位「分」（道具直购必填）
     * @param {number} [params.buyQuantity] - 购买数量
     * @param {string} [params.mode] - goods（道具直购）/ coin（代币充值）
     * @param {string} [params.attach] - 透传数据
     * @param {string} [params.appId] - 小程序 AppID，由 controller 从请求头 x-wx-appid 注入
     * @returns {Promise<Object>} payData
     */
    async createOrder(params) {
        const {
            code,
            outTradeNo,
            productId,
            goodsPrice,
            buyQuantity = 1,
            mode = 'goods',
            attach,
            appId,
        } = params;

        // 1. code 换 sessionKey（signature 必需）
        // AppID 优先用「平台注入的请求头 x-wx-appid」（可信、无需配置），回退环境变量
        // 错误信息里带上环境变量摘要，排查时不需要再去翻冷启动日志
        const resolvedAppId = appId || xpayConfig.appId;
        if (!resolvedAppId) {
            throw new Error(
                '缺少 appId：请配置 appId 环境变量，'
                + '或经 wx.cloud.callHTTPFunction 调用（平台注入 x-wx-appid）'
                + ` ｜环境变量: ${envSummary()}`
            );
        }
        if (!xpayConfig.appSecret) {
            throw new Error(
                '缺少 secret：请配置 secret 环境变量（集成中心注入名 secret）'
                + ` ｜环境变量: ${envSummary()}`
            );
        }

        // ⚠️ 纯本地校验必须放在 code2Session **之前**：
        //    js_code 是一次性凭证，先换 sessionKey 再校验参数的话，
        //    参数不合法时 code 已被消耗，前端用同一个 code 重试会报 40029，
        //    把「参数错误」放大成「登录态失效」。

        // 1. 业务单号：不传则自动生成，传了要校验合法性
        const tradeNo = outTradeNo || generateOutTradeNo();
        const err = validateOutTradeNo(tradeNo);
        if (err) throw new Error(err);

        // 2. 道具直购必须带 productId + goodsPrice，且金额/数量必须是合法正整数
        //    （goodsPrice: null 不能靠 === undefined 判空，null 会被下游静默跳过）
        const payMode = mode === 'coin' ? MODE.COIN : MODE.GOODS;
        if (payMode === MODE.GOODS) {
            if (!productId || goodsPrice === undefined || goodsPrice === null) {
                throw new Error('道具直购必须传 productId 与 goodsPrice（单位：分，须与后台一致）');
            }
            if (!Number.isInteger(Number(goodsPrice)) || Number(goodsPrice) <= 0) {
                throw new Error(`goodsPrice 非法：${goodsPrice}（必须是正整数，单位：分）`);
            }
        }
        const qty = Number(buyQuantity === undefined ? 1 : buyQuantity);
        if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
            throw new Error(`buyQuantity 非法：${buyQuantity}（必须是 1-100 的整数）`);
        }

        // 3. 参数全部合法后才消耗 code
        const { openid, sessionKey } = await code2Session(
            resolvedAppId,
            xpayConfig.appSecret,
            code
        );

        // 4. 构造 signData（原样字符串，后续签名与返回前端共用同一个）
        const signData = buildSignData({
            offerId: xpayConfig.offerId,
            buyQuantity: qty,
            env,
            productId,
            goodsPrice,
            outTradeNo: tradeNo,
            attach,
            mode: payMode,
        });

        // 5. 双签名
        const payData = signForClient(signData, sessionKey, payMode);

        // 6. 记录待支付订单（生产环境应落库）
        this._trackOrder(tradeNo, {
            outTradeNo: tradeNo,
            openid,
            productId,
            goodsPrice,
            buyQuantity,
            mode: payMode,
            state: 'PENDING',
            createdAt: Date.now(),
        });

        // appId 不是密钥（公开信息），打出来便于确认用的是哪个小程序身份
        console.info('[XpayService] 下单参数已生成:', {
            outTradeNo: tradeNo, openid, mode: payMode, appId: resolvedAppId,
        });

        return {
            ...payData,
            outTradeNo: tradeNo,
            openid,
        };
    }

    /**
     * 查单（兜底发货）
     *
     * 与 createOrder 保持同一分层：换 sessionKey、取权威 openid 都在 service 内，
     * controller 只做参数校验与响应封装。
     *
     * ⚠️ 身份只能用 code2Session 返回的 openid：
     *     sessionKey 与该 openid 绑定，若改用请求头里的 openid，
     *     两者不一致时签名必然失败，且错误信息指向「签名错误」，极难排查。
     *
     * @param {Object} params
     * @param {string} params.code - 前端 wx.login() 获取的 code
     * @param {string} params.outTradeNo - 业务单号
     * @param {string} [params.openId] - 请求身份（用于一致性校验）
     * @param {string} [params.appId] - 小程序 AppID
     * @returns {Promise<Object>} 订单详情
     */
    async queryOrder({ code, outTradeNo, openId, appId }) {
        const resolvedAppId = appId || xpayConfig.appId;
        if (!resolvedAppId) {
            throw new Error('缺少 appId：请配置 appId 环境变量，'
                + '或经 wx.cloud.callHTTPFunction 调用（平台注入 x-wx-appid）');
        }
        if (!xpayConfig.appSecret) {
            throw new Error('缺少 secret：请配置 secret 环境变量（集成中心注入名 secret）');
        }

        const { openid: sessionOpenid, sessionKey } = await code2Session(
            resolvedAppId,
            xpayConfig.appSecret,
            code
        );

        if (openId && sessionOpenid && openId !== sessionOpenid) {
            const err = new Error('请求身份与 code 所属用户不一致');
            err.status = 401;
            throw err;
        }

        return this.strategy.queryOrder(
            { openid: sessionOpenid || openId, outTradeNo },
            sessionKey
        );
    }

    // ========== 异步回调 ==========

    /**
     * 处理网关转发来的回调明文
     *
     * ⚠️ 验签与解密由集成中心网关完成（Token SHA1 验签 + AES-256-CBC 解密），
     *    业务函数拿到的是明文，代码中不出现 Token / EncodingAESKey，也不实现密码学逻辑。
     *
     * ⚠️ 错误语义：本方法**不吞异常**。
     *    结构性错误（缺 Event）标记 nonRetryable 后抛出；业务处理失败直接抛出。
     *    由 controller 决定应答码：不可重试 → 0；可重试 → 非 0（触发微信重推）。
     *
     * @param {Object} body - 推送明文
     * @returns {Object} 处理结果，含 iOS 退款决策
     */
    async handleCallback(body) {
        // 网关可能把明文放在 ParsedContent（与微信支付集成保持一致）
        const event = body?.ParsedContent || body;
        const eventType = event?.Event || event?.event;
        const outTradeNo = event?.OutTradeNo || event?.out_trade_no;

        // 平台单号（wx_order_id）：官方口径以它做幂等去重，比商家单号权威
        // 三种形态都要认：
        //   ① JSON 推送：WeChatPayInfo.MchOrderNo（嵌套）
        //   ② XML 推送：xmlToObject 只做一层提取，嵌套的 MchOrderNo 被平铺到顶层
        //   ③ 部分文档写法：wx_order_id
        const wxOrderId = event?.WeChatPayInfo?.MchOrderNo
            || event?.MchOrderNo
            || event?.wx_order_id;

        if (!eventType) {
            console.error('[XpayService] 回调缺少 Event 字段，无法分发');
            const err = new Error('回调缺少 Event 字段，无法分发');
            // 结构性错误：微信重推多少次都不会变好
            err.nonRetryable = true;
            throw err;
        }

        const semantic = XPAY_EVENTS[eventType];
        if (!semantic) {
            console.info('[XpayService] 未订阅的事件类型，忽略:', eventType);
            return { ok: true, ignored: true, eventType };
        }

        console.info(`[XpayService] 事件 ${eventType} → ${semantic.desc}`);

        // iOS 退款问询：必须 3 秒内应答，且要带决策凭据
        if (semantic.quickResponse) {
            const decision = await this._decideIosRefund(outTradeNo, event);
            return {
                ok: true,
                eventType,
                biz: semantic.biz,
                iosRefundQueryResponse: decision,
            };
        }

        // 幂等键：**事件类型 + 平台单号**，缺失时回退商家单号
        //
        // ⚠️ 为什么用 wx_order_id 而不是 outTradeNo：
        //    用户取消后重新下单可能复用同一个 outTradeNo，用商家单号去重会误判成「重复」→ 漏发货。
        // ⚠️ 为什么必须带事件类型：
        //    发货与退款推送带的是同一个单号。只用单号做 key 的话，
        //    先到的发货事件会占住 key，后续退款事件被判为「重复」直接丢弃
        //    → 道具不回收，钱已经退了。
        // 单号先规范化再用：非字符串 / 带前后空格 / 超长都会让拼接后的 key 歧义，
        // 出现「两个不同订单撞成同一个幂等键」→ 后到的那笔被当成重复事件丢弃
        const normalizeKeyPart = (v) => (typeof v === 'string' && v.trim() && v.length <= 64
            ? v.trim()
            : null);
        const keyPart = normalizeKeyPart(wxOrderId) || normalizeKeyPart(outTradeNo);
        const idempotencyKey = keyPart ? `${eventType}|${keyPart}` : null;

        // 幂等：此处**只查重、不落标记**
        // ⚠️ 标记必须等业务处理成功后再写。若先写标记再处理，
        //    一旦处理抛错，微信重推会被判定为「重复事件」直接忽略 → 永久丢单。
        if (semantic.idempotent && idempotencyKey && this.processedEvents.has(idempotencyKey)) {
            console.warn('[XpayService] 重复事件已忽略:', idempotencyKey);
            return { ok: true, duplicated: true, eventType, outTradeNo, wxOrderId };
        }

        // 业务处理：抛错则原样冒泡，由 controller 返回非 0 触发微信重推
        // TODO(业务侧)：在此对接自己的订单表与道具/代币余额
        //   1. deliver  → 幂等发货，并可选调 /xpay/notify_provide_goods 通知完成
        //   2. coin     → 更新代币余额
        //   3. refund   → 更新订单状态 + 回收道具
        //   4. complaint→ 记录投诉，人工跟进
        //   5. risk     → 记录风控事件，按需申诉
        switch (semantic.biz) {
            case 'deliver':
                this._updateOrderState(outTradeNo, 'DELIVERED');
                break;
            case 'coin':
                this._updateOrderState(outTradeNo, 'COIN_PAID');
                break;
            case 'refund':
                this._updateOrderState(outTradeNo, 'REFUNDED');
                break;
            default:
                break;
        }

        // ✅ 业务处理成功后才落幂等标记
        if (semantic.idempotent && idempotencyKey) {
            this._markProcessed(idempotencyKey);
        }

        return {
            ok: true,
            eventType,
            biz: semantic.biz,
            outTradeNo,
            wxOrderId,
            openid: event?.OpenId || event?.openid,
        };
    }

    /**
     * iOS 退款问询决策
     * Apple 会连续问询 3 次，每次须在 3 秒内应答；3 次都超时则结果标记为「不确定」
     *
     * 🚨 默认策略是「未发货即放过」，且依赖内存中的订单状态：
     *    云函数冷启动后 orders 为空 → 一律返回 0（放过），
     *    对已发货订单存在**资损风险**。
     *    生产环境必须改为查询持久化订单表，并按真实业务规则决策。
     *
     * TODO(业务侧)：替换为持久化查询 + 真实风控规则
     * @param {string} outTradeNo
     * @param {Object} event
     * @returns {Promise<{result_code: number, result_info?: string, evidence: string}>}
     */
    async _decideIosRefund(outTradeNo, event) {
        const order = this.orders.get(outTradeNo);
        // 默认策略：未发货则放过（建议退款），已发放权益则拦截
        //
        // ⚠️ 不能只判 === 'DELIVERED'：代币充值成功写的是 COIN_PAID、
        //    已退款写的是 REFUNDED，漏判会导致「代币已到账 + Apple 仍放行退款」的资损，
        //    已退款订单还会被再次建议退款。这里按「权益是否已发放」列全状态。
        const delivered = !!order && ENTITLEMENT_GRANTED_STATES.has(order.state);
        const resultCode = delivered ? 1 : 0;

        if (!order) {
            console.warn('[XpayService] iOS 退款问询：本地无订单记录，按「未发货」放过:', outTradeNo);
        }
        console.info('[XpayService] iOS 退款问询决策:', { outTradeNo, resultCode });

        return {
            result_code: resultCode,
            result_info: delivered ? '已发货，拒绝退款' : '订单未发货，建议退款',
            // evidence 必填：退款审计凭据
            evidence: `订单 ${outTradeNo} 状态=${order ? order.state : 'UNKNOWN'}`,
        };
    }

    // ========== 内存追踪（示例实现，生产请替换为数据库）==========

    /**
     * 记录已处理事件（带容量上限）
     * 超限时按插入顺序淘汰最早一条，避免热实例内存无界增长
     */
    _markProcessed(key) {
        if (!key) return;
        if (this.processedEvents.size >= MAX_TRACKED_EVENTS) {
            const oldest = this.processedEvents.values().next().value;
            this.processedEvents.delete(oldest);
        }
        this.processedEvents.add(key);
    }

    /** 记录订单（带容量上限） */
    _trackOrder(outTradeNo, order) {
        if (!outTradeNo) return;
        if (this.orders.size >= MAX_TRACKED_ORDERS && !this.orders.has(outTradeNo)) {
            const oldest = this.orders.keys().next().value;
            this.orders.delete(oldest);
        }
        this.orders.set(outTradeNo, order);
    }

    _updateOrderState(outTradeNo, state) {
        if (!outTradeNo) return;
        const order = this.orders.get(outTradeNo) || { outTradeNo };
        order.state = state;
        order.updatedAt = Date.now();
        this._trackOrder(outTradeNo, order);
    }
}

module.exports = XpayService;
module.exports.XPAY_EVENTS = XPAY_EVENTS;
module.exports.MAX_TRACKED_EVENTS = MAX_TRACKED_EVENTS;
module.exports.MAX_TRACKED_ORDERS = MAX_TRACKED_ORDERS;

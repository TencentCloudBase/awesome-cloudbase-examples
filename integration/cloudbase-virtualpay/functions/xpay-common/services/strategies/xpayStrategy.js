/**
 * 虚拟支付服务端接口策略（/xpay/*）
 *
 * 与普通微信支付 V3 的差异：
 * - 普通支付：商户私钥 RSA-SHA256 签名 + 平台证书验签，走 mch 体系
 * - 虚拟支付：HMAC-SHA256 双签名（AppKey + sessionKey），走米大师（Midas）中台
 *
 * ⚠️ 命名风格差异（很容易写错）：
 *   C 端 signData 用驼峰：offerId / outTradeNo / goodsPrice
 *   服务端接口用下划线：offer_id / out_trade_no
 */
const { xpayConfig, env, envSummary } = require('../../config/config');
const { signForServer } = require('../signService');
const { getAccessToken, httpsPostJson } = require('../../utils/wechatApi');

const API_HOST = 'https://api.weixin.qq.com';

class XpayStrategy {
    constructor() {
        this.xpayConfig = xpayConfig;
    }

    /**
     * 通用接口调用
     *
     * 🚨 签名参数放 **query**，不放请求体（已按官方文档确认）
     *   官方原文：「签名参数为 pay_sig，加在 query 后面」
     *   实测踩过：放进 body → `268490002 签名字段[pay_sig]为空`
     *
     * 🚨 post_body 口径：
     *   签名基串 = 实际发出的请求体原样字符串（不含任何签名字段，也不含 query）
     *   一旦 JSON.parse 再 stringify 改了键顺序，签名即失效
     *
     * ⚠️ 各接口的 body 字段以官方文档为准，本文件已按文档核对 query_order；
     *    其余接口（query_user_balance / currency_pay / refund_order …）字段名
     *    仍待逐个联调确认，见各方法上的 TODO。
     *
     * @param {string} uri - 接口路径，如 '/xpay/query_order'（签名基串里的 uri 不带 query）
     * @param {Object} bizParams - 业务参数（下划线风格）
     * @param {string} sessionKey
     * @param {string} [appId] - 小程序 AppID，**必须与 code2Session 用的是同一个**
     * @returns {Promise<Object>}
     */
    async call(uri, bizParams, sessionKey, appId) {
        // 1. 请求体原样字符串：既是发出内容，也是签名基串，绝不重新序列化
        const postBody = JSON.stringify(bizParams);

        // 2. 双签名：paySig 的 uri 用实际接口路径（C 端才是固定的 requestVirtualPayment）
        const { signature, paySig } = signForServer(uri, postBody, sessionKey);

        // 3. 换取 access_token（带缓存 + 并发去重）
        //
        // 🚨 appId 必须与下单/查单换 sessionKey 时一致：
        //    下单链路优先用平台注入的请求头 x-wx-appid，支持「只靠请求头部署、不配 appId 环境变量」。
        //    如果这里只读 xpayConfig.appId（环境变量），就会出现
        //    「下单成功、查单 41002（appid 缺失/不匹配）」—— 错误信息完全不指向 appId。
        const tokenAppId = appId || xpayConfig.appId;
        if (!tokenAppId) {
            throw new Error(
                `缺少 appId：换 access_token 需要与 code2Session 相同的 AppID（当前环境变量: ${envSummary()}）`
            );
        }
        const token = await getAccessToken(tokenAppId, xpayConfig.appSecret);

        // 4. 签名放 query —— 放 body 微信读不到
        const query = [
            `access_token=${encodeURIComponent(token)}`,
            `pay_sig=${encodeURIComponent(paySig)}`,
        ];
        if (signature) {
            query.push(`signature=${encodeURIComponent(signature)}`);
        }
        const url = `${API_HOST}${uri}?${query.join('&')}`;

        const res = await httpsPostJson(url, postBody);

        if (res.errcode) {
            throw new Error(`${uri} 失败 (${res.errcode}): ${res.errmsg || '未知错误'}`);
        }
        return res;
    }

    /**
     * 查询订单（现金单）—— 推送丢失时的兜底发货依据
     *
     * 官方 body 字段：openid / env / order_id（与 wx_order_id 二选一）
     * ⚠️ 没有 offer_id、没有 out_trade_no —— 订单号字段名是 order_id
     */
    async queryOrder(params, sessionKey) {
        return this.call('/xpay/query_order', {
            openid: params.openid,
            env,
            order_id: params.outTradeNo,
        }, sessionKey, params.appId);
    }

    /**
     * 查询代币余额
     *
     * 官方示例 body：{"openid": "xxx", "user_ip": "127.0.0.1", "env": 0}
     * ⚠️ 需要 user_ip（用户的出口 IP），由调用方从请求头取出后传入
     * ⚠️ 官方示例里没有 offer_id，本实现保留 + 待联调确认是否为未知字段
     */
    async queryUserBalance(params, sessionKey) {
        return this.call('/xpay/query_user_balance', {
            openid: params.openid,
            user_ip: params.userIp,
            offer_id: params.offerId || xpayConfig.offerId,
            env,
        }, sessionKey, params.appId);
    }

    /** 扣减代币（代币支付） */
    async currencyPay(params, sessionKey) {
        return this.call('/xpay/currency_pay', {
            openid: params.openid,
            offer_id: params.offerId || xpayConfig.offerId,
            out_trade_no: params.outTradeNo,
            pay_coin: params.payCoin,
            env,
        }, sessionKey, params.appId);
    }

    /** 代币支付退款 */
    async cancelCurrencyPay(params, sessionKey) {
        return this.call('/xpay/cancel_currency_pay', {
            openid: params.openid,
            offer_id: params.offerId || xpayConfig.offerId,
            out_trade_no: params.outTradeNo,
            env,
        }, sessionKey, params.appId);
    }

    /**
     * 代币赠送
     * ⚠️ 官方：不支持按单号查询结果，只能重试到返回 0 或重复操作码 268490004 为止
     */
    async presentCurrency(params, sessionKey) {
        return this.call('/xpay/present_currency', {
            openid: params.openid,
            offer_id: params.offerId || xpayConfig.offerId,
            out_trade_no: params.outTradeNo,
            present_coin: params.presentCoin,
            env,
        }, sessionKey, params.appId);
    }

    /** 通知已发货完成（现金单） */
    async notifyProvideGoods(params, sessionKey) {
        return this.call('/xpay/notify_provide_goods', {
            openid: params.openid,
            offer_id: params.offerId || xpayConfig.offerId,
            out_trade_no: params.outTradeNo,
            env,
        }, sessionKey, params.appId);
    }

    /**
     * 启动订单退款任务
     * ⚠️ 仅安卓/鸿蒙/Windows 可用；iOS 订单开发者无法主动退款
     * ⚠️ 官方：本接口**只是启动退款任务**，不等于退款完成 ——
     *    必须用 query_order 轮询到状态为退款完成（5/6/7/8），或等 xpay_refund_notify
     */
    async refundOrder(params, sessionKey) {
        return this.call('/xpay/refund_order', {
            openid: params.openid,
            offer_id: params.offerId || xpayConfig.offerId,
            out_trade_no: params.outTradeNo,
            out_refund_no: params.outRefundNo,
            refund_amount: params.refundAmount,
            env,
        }, sessionKey, params.appId);
    }

    /** 下载小程序账单 */
    async downloadBill(params, sessionKey) {
        return this.call('/xpay/download_bill', {
            date: params.date,
            offer_id: params.offerId || xpayConfig.offerId,
            env,
        }, sessionKey, params.appId);
    }
}

module.exports = XpayStrategy;

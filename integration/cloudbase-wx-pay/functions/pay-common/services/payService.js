/**
 * 支付服务（策略入口）
 * 主动请求（下单/退款/转账）永远走 SDK 自签名直连微信
 * 回调处理根据 signMode 决定：自己验签解密 或 读取集成中心已解密的明文
 */
const { signMode, verifyMode, payConfig } = require('../config/config');
const SdkStrategy = require('./strategies/sdkStrategy');
const OrderService = require('./orderService');

class PayService {

    constructor() {
        this.orderService = new OrderService();

        // 永远使用 SDK 策略（自己签名直连微信）
        this.strategy = new SdkStrategy(payConfig);
        console.log(`[PayService] 签名模式: SDK | 回调处理: ${signMode} | 验签方式: ${verifyMode}`);
    }

    // ========== 统一下单（支持多平台）==========

    /**
     * 统一下单
     * @param {Object} params - 下单参数
     * @param {string} payType - 支付类型: jsapi | h5 | native
     * @returns {Object} 微信支付返回结果
     */
    async unifiedOrder(params, payType = 'jsapi') {
        try {
            // 注入通用参数
            // 根据 useServiceAccount 参数选择 appId（支持服务号/小程序双账号）
            if (params.useServiceAccount) {
                if (!payConfig.serviceAppId) {
                    throw new Error('useServiceAccount=true 但未配置 service_app_id 环境变量，请在 CloudBase 控制台为 pay-common 云函数添加该环境变量');
                }
                params.appid = payConfig.serviceAppId;
            } else {
                params.appid = params.appid || payConfig.appId;
            }
            // 用完删除，不传给微信支付 API
            delete params.useServiceAccount;
            params.mchid = params.mchid || payConfig.mchId;

            // 根据支付类型设置回调 URL
            params.notify_url = params.notify_url || payConfig.jsapiNotifyUrl;

            // 根据支付类型调不同接口
            let result;
            switch (payType) {
                case 'h5':
                    result = await this.strategy.h5(params);
                    break;
                case 'native':
                    result = await this.strategy.native(params);
                    break;
                case 'jsapi':
                default:
                    result = await this.strategy.jsapi(params);
                    break;
            }

            if (result.status === 200 && result.data) {
                await this.orderService.handlerUnified(params);
                return result;
            } else {
                console.error(`[PayService] ${payType} 下单失败: status=${result?.status}, code=${result?.data?.code}, message=${result?.data?.message}`);
                return result;
            }
        } catch (err) {
            console.error('[PayService] unifiedOrder error:', err);
            throw err;
        }
    }

    // ========== 回调处理 ==========

    /**
     * 支付回调处理
     * SDK 模式：验签 → 解密 → 处理业务
     * 网关模式：集成中心已解密，明文在 header 中（x-tcb-wechatpay-decrypted）
     * @param {Object} callbackParams - 回调参数
     * @returns {Object} 解密后的支付结果
     */
    async handlePayCallback(callbackParams) {
        let payResult;

        if (signMode === 'gateway' && callbackParams.decryptedData) {
            // 网关模式：集成中心已解密，直接使用明文
            payResult = callbackParams.decryptedData;
        } else {
            // SDK 模式（或网关模式但无解密数据时回退）：自己验签 + 解密
            const verified = await this.strategy.verifySign(callbackParams);
            if (!verified) {
                console.error('[PayService] 支付回调验签失败');
                return null;
            }

            const { ciphertext, associated_data, nonce } = callbackParams.body.resource;
            payResult = await this.strategy.decryptResource(ciphertext, associated_data, nonce);
        }

        console.info('[PayService] 支付回调结果: out_trade_no=%s, trade_state=%s', payResult?.out_trade_no, payResult?.trade_state);

        // 异步处理业务（不阻塞回调应答）
        this.orderService.handlerUnifiedTrigger(payResult).catch(err => {
            console.error('[PayService] 异步处理支付回调业务失败:', err);
        });

        return payResult;
    }

    /**
     * 退款回调处理
     */
    async handleRefundCallback(callbackParams) {
        let refundResult;

        if (signMode === 'gateway' && callbackParams.decryptedData) {
            // 网关模式：集成中心已解密，直接使用明文
            refundResult = callbackParams.decryptedData;
        } else {
            // SDK 模式（或网关模式但无解密数据时回退）：自己验签 + 解密
            const verified = await this.strategy.verifySign(callbackParams);
            if (!verified) {
                console.error('[PayService] 退款回调验签失败');
                return null;
            }

            const { ciphertext, associated_data, nonce } = callbackParams.body.resource;
            refundResult = await this.strategy.decryptResource(ciphertext, associated_data, nonce);
        }

        console.info('[PayService] 退款回调结果: out_refund_no=%s, refund_status=%s', refundResult?.out_refund_no, refundResult?.refund_status);

        this.orderService.handlerRefundTrigger(refundResult).catch(err => {
            console.error('[PayService] 异步处理退款回调业务失败:', err);
        });

        return refundResult;
    }

    // ========== 查询 ==========

    async queryOrderByOutTradeNo(params) {
        return this.strategy.query(params);
    }

    async queryOrderByTransactionId(params) {
        return this.strategy.query(params);
    }

    // ========== 关闭订单 ==========

    async closeOrder(params) {
        return this.strategy.close(params);
    }

    // ========== 退款 ==========

    async refund(params) {
        try {
            params.notify_url = params.notify_url || payConfig.refundNotifyUrl;
            const result = await this.strategy.refund(params);

            if (result.status === 200 && result.data) {
                await this.orderService.handlerRefund(params);
                return result;
            } else {
                console.error('[PayService] 退款失败: status=%s, code=%s, message=%s', result?.status, result?.data?.code, result?.data?.message);
                return result;
            }
        } catch (err) {
            console.error('[PayService] refund error:', err);
            throw err;
        }
    }

    async queryRefund(params) {
        return this.strategy.queryRefund(params);
    }

    // ========== 商家转账 ==========

    /**
     * 发起商家转账（升级版 - 单笔模式）
     * 文档：https://pay.weixin.qq.com/doc/v3/merchant/4012716434
     *
     * ⚠️ 重要：
     * 1. 受理成功 ≠ 转账成功，必须通过查单或回调确认最终状态
     * 2. 系统错误/资金不足/频率超限时，必须用相同参数重试，勿更换单号
     * 3. user_name 字段规则：< 0.3元不填，≥ 2000元必填
     */
    async transfer(params) {
        try {
            // 注入通用参数
            // 根据 useServiceAccount 参数选择 appId（支持服务号/小程序双账号）
            if (params.useServiceAccount) {
                if (!payConfig.serviceAppId) {
                    throw new Error('useServiceAccount=true 但未配置 service_app_id 环境变量，请在 CloudBase 控制台为 pay-common 云函数添加该环境变量');
                }
                params.appid = payConfig.serviceAppId;
            } else {
                params.appid = params.appid || payConfig.appId;
            }
            // 用完删除，不传给微信支付 API
            delete params.useServiceAccount;
            // 转账回调 URL
            params.notify_url = params.notify_url || payConfig.transferNotifyUrl || '';

            const result = await this.strategy.transfer(params);

            if (result.status === 200 && result.data?.out_bill_no) {
                console.info('[PayService] 转账受理成功, transfer_bill_no:', result.data.transfer_bill_no, 'out_bill_no:', result.data.out_bill_no);
                // 业务钩子：记录转账单
                await this.orderService.handlerTransfer(params, result.data);
            } else {
                console.error('[PayService] 转账失败: status=%s, code=%s, message=%s', result?.status, result?.data?.code, result?.data?.message);
            }

            return result;
        } catch (err) {
            console.error('[PayService] transfer error:', err);
            throw err;
        }
    }

    /**
     * 商户单号查询转账单（升级版）
     */
    async queryTransferBill(params) {
        return this.strategy.queryTransferBill(params);
    }

    /**
     * 微信单号查询转账单（升级版）
     */
    async queryTransferBillByNo(params) {
        return this.strategy.queryTransferBillByNo(params);
    }

    /**
     * 商家转账回调处理
     */
    async handleTransferCallback(callbackParams) {
        let transferResult;

        if (signMode === 'gateway' && callbackParams.decryptedData) {
            // 网关模式：集成中心已解密，直接使用明文
            transferResult = callbackParams.decryptedData;
        } else {
            // SDK 模式（或网关模式但无解密数据时回退）：自己验签 + 解密
            const verified = await this.strategy.verifySign(callbackParams);
            if (!verified) {
                console.error('[PayService] 转账回调验签失败');
                return null;
            }

            const { ciphertext, associated_data, nonce } = callbackParams.body.resource;
            transferResult = await this.strategy.decryptResource(ciphertext, associated_data, nonce);
        }

        console.info('[PayService] 转账回调结果: out_bill_no=%s, state=%s', transferResult?.out_bill_no, transferResult?.state);

        this.orderService.handlerTransferTrigger(transferResult).catch(err => {
            console.error('[PayService] 异步处理转账回调业务失败:', err);
        });

        return transferResult;
    }
}

module.exports = PayService;

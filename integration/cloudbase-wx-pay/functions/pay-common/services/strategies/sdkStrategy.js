/**
 * SDK 签名策略
 * 使用 wechatpay-node-v3 SDK 自行签名验签
 */
const WxPay = require('wechatpay-node-v3');
const crypto = require('crypto');
const https = require('https');
const { verifyMode: defaultVerifyMode } = require('../../config/config');

class SdkStrategy {
    constructor(payConfig) {
        this.payConfig = payConfig;
        this.verifyMode = defaultVerifyMode;

        if (this.verifyMode === 'certificate') {
            // 证书模式：SDK 构造函数无条件要求 publicKey（wechatpay-node-v3#2.2.x 已知限制）
            // 传空对象绕过构造函数校验，实际验签由 verifySign() 走 Pay.certificates 自动管理
            this.wxPay = new WxPay({
                appid: payConfig.appId,
                mchid: payConfig.mchId,
                serial_no: payConfig.mchSerialNo,
                key: payConfig.mchAPIv3Key,
                privateKey: payConfig.mchPrivateKey,
                publicKey: '__CERT_MODE_PLACEHOLDER__', // wechatpay-node-v3#2.2.x 要求 publicKey 必填；证书模式下实际验签使用 getCertificates() 获取的平台证书
            });
            console.log('[SdkStrategy] 验证模式: CERTIFICATE（SDK 内置证书管理）');
        } else {
            // 公钥模式：使用固定公钥验签（原有逻辑）
            this.wxPay = new WxPay({
                appid: payConfig.appId,
                mchid: payConfig.mchId,
                serial_no: payConfig.mchSerialNo,
                key: payConfig.mchAPIv3Key,
                privateKey: payConfig.mchPrivateKey,
                publicKey: payConfig.mchWechatpayPublicKey,
            });
            console.log('[SdkStrategy] 验证模式: PUBLICKEY（固定公钥）');
        }
    }

    // ========== 下单 ==========

    /**
     * JSAPI/小程序下单
     * SDK 的 transactions_jsapi 只返回 prepay_id，
     * 需要额外生成调起支付所需的签名参数（timeStamp、nonceStr、paySign）
     */
    async jsapi(params) {
        const result = await this.wxPay.transactions_jsapi(params);

        // 下单成功，生成调起支付参数
        if (result.status === 200 && result.data?.prepay_id) {
            const prepay_id = result.data.prepay_id;
            const timeStamp = Math.floor(Date.now() / 1000).toString();
            const nonceStr = crypto.randomBytes(16).toString('hex');
            const packageStr = `prepay_id=${prepay_id}`;

            // 使用请求中的 appid（支持多 appId 场景），回退到配置值
            const appId = params.appid || this.payConfig.appId;

            // 拼接签名串：appId\ntimeStamp\nnonceStr\npackage\n
            const signStr = `${appId}\n${timeStamp}\n${nonceStr}\n${packageStr}\n`;
            const paySign = crypto
                .createSign('RSA-SHA256')
                .update(signStr)
                .sign(this.payConfig.mchPrivateKey, 'base64');

            // 返回前端调起支付所需的完整参数
            result.data = {
                appId,
                prepay_id,
                timeStamp,
                nonceStr,
                package: packageStr,
                signType: 'RSA',
                paySign,
            };
        }

        return result;
    }

    async h5(params) {
        return this.wxPay.transactions_h5(params);
    }

    async native(params) {
        return this.wxPay.transactions_native(params);
    }

    // ========== 查询 ==========

    async query(params) {
        return this.wxPay.query(params);
    }

    // ========== 关闭 ==========

    async close(params) {
        if (!params?.out_trade_no) {
            throw new Error('closeOrder 缺少 out_trade_no 参数');
        }
        // ⚠️ wechatpay-node-v3 的 close 方法签名: close(out_trade_no: string)
        // 必须传字符串，不能传对象，否则 URL 会拼成 [object Object]
        return this.wxPay.close(params.out_trade_no);
    }

    // ========== 退款 ==========

    async refund(params) {
        return this.wxPay.refunds(params);
    }

    async queryRefund(params) {
        if (!params?.out_refund_no) {
            throw new Error('queryRefund 缺少 out_refund_no 参数');
        }
        // ⚠️ wechatpay-node-v3 的 find_refunds 方法签名: find_refunds(out_refund_no: string)
        // 必须传字符串，不能传对象，否则 URL 会拼成 [object Object]
        return this.wxPay.find_refunds(params.out_refund_no);
    }

    // ========== 商家转账（升级版） ==========

    /**
     * 发起商家转账（POST /v3/fund-app/mch-transfer/transfer-bills）
     *
     * ⚠️ 本模板仅支持【免密小额转账（0.3 - 2000 元，不含 user_name）】场景。
     *
     * 📌 限制说明：
     *   - 官方要求：转账金额 ≥ 2000 元时，必须填写 user_name（收款人姓名）
     *   - user_name 是【敏感字段】，必须使用微信支付公钥进行 RSA/OAEP 加密
     *   - 本模板【未实现】加密逻辑，因此【禁止传入 user_name】
     *
     * 🔧 如需支持 ≥ 2000 元转账（含 user_name），请自行改造：
     *   1. 引入 crypto.publicEncrypt 用微信支付公钥加密 user_name
     *      加密参数：RSA_PKCS1_OAEP_PADDING + SHA-1
     *   2. 对 user_name 先加密再发送
     *   3. Header 已正确设置 Wechatpay-Serial（公钥 ID），无需改动
     *
     * 📚 参考文档：
     *   - 接口定义: https://pay.weixin.qq.com/doc/v3/merchant/4012716434
     *   - 敏感信息加密: https://pay.weixin.qq.com/doc/v3/merchant/4013053257
     *
     * wechatpay-node-v3 SDK 不内置此接口，这里走自签名 HTTP 请求
     */
    async transfer(params) {
        // 🚫 运行时保护：拦截包含 user_name 的请求，避免明文上送触发官方报错
        if (params.user_name) {
            throw new Error(
                '[pay-common] 本模板未实现 user_name 加密逻辑，禁止传入。' +
                '如需 ≥ 2000 元转账场景，请参考 sdkStrategy.js 注释自行实现加密。' +
                '文档：https://pay.weixin.qq.com/doc/v3/merchant/4013053257'
            );
        }

        const url = '/v3/fund-app/mch-transfer/transfer-bills';
        const bodyStr = JSON.stringify(params);
        const result = await this._signAndRequest('POST', url, bodyStr);
        return result;
    }

    /**
     * 商户单号查询转账单（GET /v3/fund-app/mch-transfer/transfer-bills/out-bill-no/{out_bill_no}）
     */
    async queryTransferBill(params) {
        const { out_bill_no } = params;
        const url = `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${out_bill_no}`;
        return this._signAndRequest('GET', url, '');
    }

    /**
     * 微信单号查询转账单（GET /v3/fund-app/mch-transfer/transfer-bills/transfer-bill-no/{transfer_bill_no}）
     */
    async queryTransferBillByNo(params) {
        const { transfer_bill_no } = params;
        const url = `/v3/fund-app/mch-transfer/transfer-bills/transfer-bill-no/${transfer_bill_no}`;
        return this._signAndRequest('GET', url, '');
    }

    /**
     * 自签名 + 发送 HTTP 请求到微信支付 API
     * 用于 SDK 不内置的接口（如商家转账）
     */
    async _signAndRequest(method, urlPath, bodyStr) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonceStr = crypto.randomBytes(16).toString('hex');

        // 构造签名串
        const signStr = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
        const signature = crypto
            .createSign('RSA-SHA256')
            .update(signStr)
            .sign(this.payConfig.mchPrivateKey, 'base64');

        const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.payConfig.mchId}",serial_no="${this.payConfig.mchSerialNo}",nonce_str="${nonceStr}",timestamp="${timestamp}",signature="${signature}"`;

        // Wechatpay-Serial：告诉微信用哪个公钥加密返回的敏感字段
        // 公钥模式使用配置的公钥 ID，证书模式从 SDK 获取平台证书 serial_no
        let wechatpaySerial;
        if (this.verifyMode === 'certificate') {
            try {
                const certs = this.wxPay.getCertificates?.();
                wechatpaySerial = Array.isArray(certs) && certs.length > 0
                    ? certs[0].serial_no || ''
                    : '';
            } catch (e) {
                console.warn('[SdkStrategy] 获取平台证书 serial 失败，Wechatpay-Serial 将为空:', e.message);
                wechatpaySerial = '';
            }
        } else {
            wechatpaySerial = this.payConfig.mchWechatpayPublicKeyId;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'pay-common/1.0 Node.js',
            'Authorization': authorization,
            'Wechatpay-Serial': wechatpaySerial,
        };

        if (bodyStr) {
            headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.mch.weixin.qq.com',
                path: urlPath,
                method,
                headers,
                timeout: 10000,  // 10 秒连接超时
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, data: JSON.parse(data) });
                    } catch {
                        resolve({ status: res.statusCode, data });
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy(new Error('微信支付 API 请求超时（10s）'));
            });
            req.on('error', reject);
            if (bodyStr && method !== 'GET') req.write(bodyStr);
            req.end();
        });
    }

    // ========== 回调验签 + 解密 ==========

    /**
     * 验签回调通知
     * @param {Object} callbackParams - { body, signature, serial, nonce, timestamp }
     * @returns {boolean}
     */
    async verifySign(callbackParams) {
        // P0: 时间戳 5 分钟过期检查（防重放攻击，两种模式共用）
        const now = Math.floor(Date.now() / 1000);
        const callbackTimestamp = parseInt(callbackParams.timestamp, 10);
        if (Math.abs(now - callbackTimestamp) > 300) {
            console.warn('回调时间戳过期，拒绝处理。callback_ts:', callbackTimestamp, 'now:', now);
            return false;
        }

        const { timestamp, nonce, body, rawBody, signature } = callbackParams;
        // 优先使用原始请求体（避免 JSON 序列化差异导致验签失败）
        const bodyStr = rawBody || (typeof body === 'object' ? JSON.stringify(body) : body);

        try {
            if (this.verifyMode === 'certificate') {
                // ===== 证书验签 =====
                const certs = this.wxPay.getCertificates?.();
                console.info('[SdkStrategy] 证书模式: getCertificates() 返回类型:', typeof certs,
                    ', 值:', JSON.stringify(certs)?.slice(0, 200),
                    ', isArray:', Array.isArray(certs),
                    ', 长度:', Array.isArray(certs) ? certs.length : 'N/A');

                // 尝试 SDK 的异步下载方法（部分版本 getCertificates 同步返回空，需主动下载）
                // 注意：wechatpay-node-v3@2.2.x 存在已知问题：
                //   get_certificates() 下载成功但不会更新内部 certificates 缓存
                //   因此必须直接从下载返回值中提取公钥，不能依赖 getCertificates()
                let matchedCert = null;
                if (!Array.isArray(certs) || certs.length === 0) {
                    console.warn('[SdkStrategy] 证书列表为空，尝试主动下载平台证书...');
                            try {
                                const dlResult = await this.wxPay.get_certificates();
                        console.info('[SdkStrategy] 下载证书结果:', typeof dlResult,
                            ', keys:', dlResult ? Object.keys(dlResult) : 'N/A');

                        // wechatpay-node-v3@2.2.x 返回格式：{ '0': { serial_no, publicKey, encrypt_certificate, ... } }
                        // 直接从返回值提取，绕过 SDK 缓存 bug
                        const rawCerts = [];
                        if (dlResult) {
                            for (const key of Object.keys(dlResult)) {
                                const item = dlResult[key];
                                if (item && item.serial_no && item.publicKey) {
                                    rawCerts.push({
                                        serial_no: item.serial_no,
                                        publicKey: item.publicKey,
                                        _source: 'download',
                                    });
                                } else if (item?.data?.data && Array.isArray(item.data.data)) {
                                    // 兼容嵌套格式
                                    item.data.data.forEach(c => {
                                        if (c.serial_no && c.encrypt_certificate) {
                                            rawCerts.push({
                                                serial_no: c.serial_no || c.effective_serial_no,
                                                publicKey: c.encrypt_certificate?.public_key || c.publicKey,
                                                _source: 'nested',
                                            });
                                        }
                                    });
                                }
                            }
                        }

                        console.info('[SdkStrategy] 从下载结果提取到', rawCerts.length, '张证书');
                        rawCerts.forEach((c, i) => {
                            console.info('  [' + i + '] serial:', c.serial_no, '| hasPublicKey:', !!c.publicKey);
                        });

                        if (rawCerts.length > 0) {
                            matchedCert = rawCerts.find(c =>
                                c.serial_no === callbackParams.serial ||
                                c.serial_no?.replace(/:/g, '') === callbackParams.serial
                            );
                            if (!matchedCert) {
                                // 如果 serial 不匹配，用第一张（微信通常只有一张平台证书）
                                console.warn('[SdkStrategy] serial不匹配，使用第一张可用证书');
                                matchedCert = rawCerts[0];
                            }
                        }
                    } catch (dlErr) {
                        console.error('[SdkStrategy] 下载平台证书失败（这通常是根因）:',
                            dlErr.code || 'NO_CODE', '-', dlErr.message || dlErr);
                        return false;
                    }

                    if (!matchedCert) {
                        console.error('[SdkStrategy] 下载后仍无可用平台证书，无法验签');
                        console.error('[SdkStrategy] 排查方向: 1.apiV3Key是否正确 2.merchantSerialNumber与私钥是否匹配 3.私钥换行符是否正确');
                        return false;
                    }
                } else {
                    matchedCert = certs.find(c =>
                        c.serial_no === callbackParams.serial ||
                        c.serial_no?.replace(/:/g, '') === callbackParams.serial
                    );
                }

                if (!matchedCert) {
                    console.error('[SdkStrategy] 未找到匹配的平台证书, callback serial:', callbackParams.serial,
                        ', 可用 serial:', (certs || []).map(c => c.serial_no));
                    return false;
                }

                const verifyStr = `${timestamp}\n${nonce}\n${bodyStr}\n`;
                const verify = crypto.createVerify('RSA-SHA256');
                verify.update(verifyStr);
                const result = verify.verify(matchedCert.publicKey, signature, 'base64');
                console.info('[SdkStrategy] 证书验签结果:', result, '(serial:', matchedCert.serial_no, ')');
                return result;
            }

            // ===== 公钥验签（原有逻辑）=====
            const verifyStr = `${timestamp}\n${nonce}\n${bodyStr}\n`;
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(verifyStr);
            const result = verify.verify(this.payConfig.mchWechatpayPublicKey, signature, 'base64');
            console.info('[SdkStrategy] 公钥验签结果:', result);
            return result;
        } catch (err) {
            console.error('[SdkStrategy] 验签异常:', err.message);
            return false;
        }
    }

    /**
     * 解密回调数据
     * @param {string} ciphertext
     * @param {string} associated_data
     * @param {string} nonce
     * @returns {Object} 解密后的明文对象
     */
    async decryptResource(ciphertext, associated_data, nonce) {
        return this.wxPay.decipher_gcm(ciphertext, associated_data, nonce);
    }
}

module.exports = SdkStrategy;

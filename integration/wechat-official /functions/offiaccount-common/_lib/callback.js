/**
 * 回调通知公共处理
 * 用于有回调通知的模版（微信支付/退款/转账等）
 *
 * 功能：
 *   - 解析网关解密 header（集成中心网关模式）
 *   - 组装 callbackParams 供 service 层处理
 *   - 统一 SUCCESS/FAIL 应答格式
 */

const { success: successRes, fail: failRes } = require('./response');

/**
 * 处理回调通知
 * @param {Object} req           - Express request
 * @param {Object} res           - Express response
 * @param {Function} handlerFn   - Service 层回调处理方法
 * @param {string} triggerName   - 日志标识（如 'unifiedOrderTrigger'）
 * @param {Object} options       - 可选配置
 * @param {string} options.decryptedHeaderKey - 网关解密 header 名称，默认 'x-tcb-wechatpay-decrypted'
 * @param {string} options.successCode         - 成功返回的 code，默认 'SUCCESS'
 * @param {string} options.failCode            - 失败返回的 code（验签失败），默认 'FAIL'
 */
async function handleCallback(req, res, handlerFn, triggerName, options = {}) {
    const {
        decryptedHeaderKey = 'x-tcb-wechatpay-decrypted',
        successCode = 'SUCCESS',
        failCode = 'FAIL',
    } = options;

    try {
        const headers = req.headers;

        // 回调日志脱敏：只打印关键标识，避免泄露签名和密文
        console.log(`[Callback] ${triggerName}:`, {
            timestamp: headers['wechatpay-timestamp'] || headers['timestamp'],
            serial: headers['wechatpay-serial'] || headers['serial'],
            event_type: req.body?.event_type,
            has_ciphertext: !!req.body?.resource?.ciphertext,
        });

        // 网关模式：解密后的明文设置在 header 中
        let decryptedData = null;
        if (headers[decryptedHeaderKey]) {
            try {
                decryptedData = JSON.parse(headers[decryptedHeaderKey]);
            } catch (e) {
                console.warn('[Callback] 解析网关解密 header 失败:', e.message);
            }
        }

        const callbackParams = {
            body: req.body,
            rawBody: req.rawBody,
            decryptedData,
            signature: headers['wechatpay-signature'] || headers['signature'],
            serial: headers['wechatpay-serial'] || headers['serial'],
            nonce: headers['wechatpay-nonce'] || headers['nonce'],
            timestamp: headers['wechatpay-timestamp'] || headers['timestamp'],
        };

        // 调用 service 层处理
        const result = await handlerFn(callbackParams);

        if (result) {
            res.status(200).json({ code: successCode, message: '成功' });
        } else {
            res.status(400).json({ code: failCode, message: '验签失败' });
        }
    } catch (err) {
        console.error(`[Callback] ${triggerName} error:`, err);
        res.status(500).json({ code: failCode, message: '处理失败' });
    }
}

module.exports = { handleCallback };

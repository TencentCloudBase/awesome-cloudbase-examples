/**
 * pay-common 配置管理
 * 优先从环境变量读取，回退到默认值
 */

const config = {
    // 回调处理模式: 'sdk' | 'gateway'
    // sdk: 回调自己验签 + AES-GCM 解密
    // gateway: 回调由集成中心解密，转发明文（x-tcb-wechatpay-decrypted header）
    // 注意：两种模式下，主动请求（下单/退款/转账）都走 SDK 自签名直连微信
    signMode: process.env.signMode || 'gateway',

    // 验签方式：根据是否配置 wxPayPublicKey 自动推断（无需手动设置）
    // 有公钥 → publickey（公钥验签，兼容旧配置）
    // 无公钥 → certificate（SDK 内置证书管理，自动拉取/刷新平台证书）
    verifyMode: (process.env.wxPayPublicKey || '') ? 'publickey' : 'certificate',

    payConfig: {
        // AppID（JSAPI/H5→公众号, 小程序→小程序, APP→移动应用）
        // 小程序场景使用此 appId
        appId: process.env.appId || '',
        // 服务号 AppID（Web 端 JSAPI 支付用，同一个商户号绑定的服务号）
        serviceAppId: process.env.service_app_id || '',
        // 支付商户号
        mchId: process.env.merchantId || '',
        // 商户 API 证书序列号
        mchSerialNo: process.env.merchantSerialNumber || '',
        // API V3 密钥（32 字节，用于回调解密）
        mchAPIv3Key: process.env.apiV3Key || '',
        // 商户 API 证书私钥（PEM 格式，用于请求签名）
        // Dockerfile ENV 中 \n 是字面量，需替换为真正换行符
        mchPrivateKey: (process.env.privateKey || '').replace(/\\n/g, '\n'),
        // 微信支付公钥（PEM 格式，用于验签）-- 注意：是"微信支付公钥"，不是"商户公钥"
        // Dockerfile ENV 中 \n 是字面量，需替换为真正换行符
        mchWechatpayPublicKey: (process.env.wxPayPublicKey || '').replace(/\\n/g, '\n'),
        // 微信支付公钥 ID（标识使用哪个公钥）
        mchWechatpayPublicKeyId: process.env.wxPayPublicKeyId || '',
        // 支付回调通知 URL（必须 https://，不能 localhost，不能带参数）
        // SDK 模式：指向自己的服务地址
        // 网关模式：指向集成中心分配的回调域名
        jsapiNotifyUrl: process.env.notifyURLPayURL || '',
        // 退款回调通知 URL
        refundNotifyUrl: process.env.notifyURLRefundsURL || '',
        // 商家转账回调通知 URL（Ext 字段无此项，pay-common 扩展）
        transferNotifyUrl: process.env.transferNotifyUrl || '',
    },
};

/**
 * 校验配置完整性
 * 根据 signMode 检查必填项，启动时调用
 */
function validateConfig() {
    const errors = [];
    const { payConfig, signMode } = config;

    // 通用必填（两种模式都需要，因为主动请求都走 SDK 自签名）
    // appId 和 serviceAppId 至少配置一个
    if (!payConfig.appId && !payConfig.serviceAppId) {
        errors.push('appId 或 serviceAppId 至少配置一个（小程序 / 服务号 AppID）');
    }
    if (!payConfig.mchId) errors.push('merchantId（支付商户号）未配置');
    if (!payConfig.mchAPIv3Key) errors.push('apiV3Key（APIv3 密钥）未配置');
    if (!payConfig.mchSerialNo) errors.push('merchantSerialNumber（商户证书序列号）未配置');
    if (!payConfig.mchPrivateKey) errors.push('privateKey（商户私钥）未配置');

    // wxPayPublicKey 仅在公钥模式下必填（证书模式由 SDK 自动管理）

    // 回调 URL 格式校验
    [
        { key: 'notifyURLPayURL', val: payConfig.jsapiNotifyUrl },
        { key: 'notifyURLRefundsURL', val: payConfig.refundNotifyUrl },
        { key: 'transferNotifyUrl', val: payConfig.transferNotifyUrl },
    ].forEach(({ key, val }) => {
        if (val) {
            if (!/^https:\/\//.test(val)) {
                errors.push(`${key} 必须以 https:// 开头（微信支付要求回调 URL 必须 HTTPS）`);
            }
            if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(val)) {
                errors.push(`${key} 不能使用内网地址（localhost/127.0.0.1）`);
            }
            if (val.includes('?')) {
                errors.push(`${key} 不能携带参数（不能包含 ?）`);
            }
        }
    });

    // signMode 值校验
    if (!['sdk', 'gateway'].includes(signMode)) {
        errors.push(`signMode 值无效: "${signMode}"，仅支持 "sdk" 或 "gateway"`);
    }

    // 公钥模式：配置了公钥则公钥 ID 也必填
    if (config.verifyMode === 'publickey') {
        if (!payConfig.mchWechatpayPublicKeyId) {
            errors.push('wxPayPublicKeyId 未配置（已配置 wxPayPublicKey 时必填）');
        }
    }

    if (errors.length > 0) {
        console.warn('⚠️ 配置校验警告（共 ' + errors.length + ' 项）:');
        errors.forEach((msg, idx) => console.warn(`  ${idx + 1}. ${msg}`));
    }

    return errors;
}

module.exports = { ...config, validateConfig };

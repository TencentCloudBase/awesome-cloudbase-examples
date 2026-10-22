/**
 * pay-common 配置管理
 * 优先从环境变量读取，回退到默认值
 */

/**
 * 联调闸门 `PAY_GUARD` 的**唯一判定口径**
 *
 * 🚨 必须规范化一次后复用，不要在 config / validateConfig 里各写一份 `=== 'off'`：
 *    控制台、`.env`、Docker `ENV` 里写成 `OFF` / `Off` / `off `（尾随空格或换行）
 *    都很常见，两处比较一旦不同步，就会出现
 *    「告警说闸门已放开 / 实际钩子仍在拒绝」这类自相矛盾的状态。
 *
 * 非 `on` / `off` 的值（含拼错）一律按 on（安全侧）处理，并在启动校验里显式提示。
 */
const PAY_GUARD_RAW = (process.env.PAY_GUARD || '').trim();
const PAY_GUARD_VALUE = PAY_GUARD_RAW.toLowerCase();
const PAY_GUARD_OFF = PAY_GUARD_VALUE === 'off';

const config = {
    // 回调处理模式: 'sdk' | 'gateway'
    // sdk: 回调自己验签 + AES-GCM 解密
    // gateway: 回调由集成中心解密，转发明文（body.ParsedContent）
    // 注意：两种模式下，主动请求（下单/退款/转账）都走 SDK 自签名直连微信
    signMode: process.env.signMode || 'gateway',

    /**
     * 平台声明的回调类型（**由集成中心创建实例时自动注入，不要手工填**）
     *
     * 变量名以平台真实注入的 `notifyURLCallbackType` 为准（URL 全大写）；
     * 小写写法 `notifyUrlCallbackType` 仅作兼容兜底，不要写进文档。
     *
     *   system      → 回调地址托管在集成中心，网关代验签 + 代解密，转发 body.ParsedContent
     *   ownservice  → 回调指向本函数，验签解密由本函数完成
     *   空          → 未声明，按「自己验签」处理（fail closed）
     *
     * 🚨 为什么要看这个变量而不是只看 signMode：
     *    signMode 是「部署意图」，任何人都能往函数端口发
     *    {"ParsedContent":{"out_trade_no":"X","trade_state":"SUCCESS"}}，
     *    光凭 signMode=gateway 无法证明请求真来自网关。
     *    notifyURLCallbackType 是平台在实例创建时注入的声明，只有真走集成中心
     *    托管回调才等于 system —— 这才是「明文可以免验签」的依据。
     */
    notifyUrlCallbackType: (process.env.notifyURLCallbackType || process.env.notifyUrlCallbackType || '')
        .trim()
        .toLowerCase(),

    // 验签方式：根据是否配置 wxPayPublicKey 自动推断（无需手动设置）
    // 有公钥 → publickey（公钥验签，兼容旧配置）
    // 无公钥 → certificate（SDK 内置证书管理，自动拉取/刷新平台证书）
    verifyMode: (process.env.wxPayPublicKey || '') ? 'publickey' : 'certificate',

    /**
     * 🚨 唯一的防护闸门：`PAY_GUARD`（on / off）
     *
     * 它回答一个问题：**orderService 的 4 个业务钩子是否生效**。
     * 这些钩子防的是「金额与订单归属由客户端决定」这一类风险 —— 同类场景共用这一个开关。
     *
     *   PAY_GUARD=on  （默认，不设也是 on）→ 4 个钩子全部生效，生产态
     *   PAY_GUARD=off （仅联调）           → 4 个钩子全部跳过
     *
     *   | 钩子                    | on / 不设                          | off（联调） |
     *   |-------------------------|------------------------------------|-------------|
     *   | verifyAmount            | 下单 400「服务端未核定订单金额」     | 直接放行     |
     *   | verifyRefundAmount      | 退款 400「服务端未核定可退金额」     | 直接放行     |
     *   | verifyOrderOwner        | 查单/关单/退款/查退款 403            | 直接放行     |
     *   | verifyTransferAllowed   | 转账/转账单查询 403                  | 直接放行     |
     *
     * ⚠️ off 的风险（任意一个已登录用户都能做到）：
     *   - 把 `amount.total` 改成 1 分钱下单；把退款金额改成任意值
     *   - 拿别人的 out_trade_no 查单 / 关单 / 退款（越权读写）
     *   - 调 /wxpay_transfer 把商户余额转给任意 openid、任意金额
     *
     * 默认值是**安全侧**：只有显式写 `off` 才放开，写错（`0` / `false` / `dev`）或漏配都是 on。
     * 联调时 400 / 403 的错误信息里会直接告诉你「把 PAY_GUARD 设为 off 并给出命令」。
     */
    insecureDemo: PAY_GUARD_OFF,

    /** 防护闸门是否处于开启（生产）状态（与 insecureDemo 同源，不会出现两份口径） */
    guardEnabled: !PAY_GUARD_OFF,

    payConfig: {
        // AppID（JSAPI/H5→公众号, 小程序→小程序）
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
 *
 * 两级输出：
 *   - errors：配置缺失 / 矛盾 → console.warn（模板保持可启动，便于看清整份清单）
 *   - risky：显式打开的**危险开关**（资金 / 越权敞口）→ console.error + 醒目横幅，
 *     与上面的普通缺失严格分开，避免「已处于不安全模式」被淹没在告警列表里
 */
function validateConfig() {
    const errors = [];
    const risky = [];
    const { payConfig, signMode } = config;

    // PAY_GUARD 拼错（非空且既不是 on 也不是 off）→ 静默落到安全侧，但必须让人看见
    if (PAY_GUARD_RAW && PAY_GUARD_VALUE !== 'on' && PAY_GUARD_VALUE !== 'off') {
        errors.push(
            `PAY_GUARD 取值无法识别: "${PAY_GUARD_RAW}"，已按 on（安全侧：钩子全部生效）处理。`
            + '联调请写 off，生产请写 on 或直接不设'
        );
    }

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

    // 免验签的两个条件必须同时成立：signMode=gateway（回调指向网关） + 平台声明 system
    // 只满足其一都会被认定为「声明与实际配置不一致」，此时代码按自验签处理（fail closed）
    const declaredGateway = config.notifyUrlCallbackType === 'system';

    if (signMode === 'gateway' && !declaredGateway) {
        errors.push(
            `signMode=gateway 但平台未声明 notifyURLCallbackType=system（当前: "${config.notifyUrlCallbackType || '空'}"）：`
            + '回调将走自验签（安全默认）。集成中心创建实例会自动注入该变量；'
            + '自建公网回调请保持不填，或改用 signMode=sdk'
        );
    }

    if (declaredGateway && signMode !== 'gateway') {
        errors.push(
            `notifyURLCallbackType=system（网关代验签）但 signMode=${signMode}：`
            + '回调地址指向本函数、函数必须开公网入口，因此网关明文不会被采信（按自验签处理）。'
            + '请把 signMode 改为 gateway，或清掉残留的 system 声明'
        );
    }

    // 声明「回调托管在网关」时，回调地址必须真的配好并指向网关分配的那个地址。
    // 三个地址全空 = 声明与配置自相矛盾（多半是切部署方式时只改了一半）。
    if (declaredGateway) {
        const notifyUrls = [
            { key: 'notifyURLPayURL', val: payConfig.jsapiNotifyUrl },
            { key: 'notifyURLRefundsURL', val: payConfig.refundNotifyUrl },
            { key: 'transferNotifyUrl', val: payConfig.transferNotifyUrl },
        ];
        const configured = notifyUrls.filter(item => item.val);
        if (configured.length === 0) {
            errors.push(
                'notifyURLCallbackType=system 声明回调由网关托管，但 notifyURLPayURL / notifyURLRefundsURL / '
                + 'transferNotifyUrl 全为空：请填入集成中心分配的回调地址'
            );
        } else {
            // 打出来供核对：切部署方式后若这里仍是旧的自建域名，说明声明与实际不符
            console.info('[config] 网关托管回调地址:', configured.map(i => `${i.key}=${i.val}`).join(', '));
        }
    }

    // 公钥模式：配置了公钥则公钥 ID 也必填
    if (config.verifyMode === 'publickey') {
        if (!payConfig.mchWechatpayPublicKeyId) {
            errors.push('wxPayPublicKeyId 未配置（已配置 wxPayPublicKey 时必填）');
        }
    }

    // PAY_GUARD=off = 联调模式，金额 + 归属全线放开 → 归入 risky，单独高亮
    if (config.insecureDemo) {
        risky.push(
            'PAY_GUARD=off（联调模式）：已跳过 orderService 的 4 个业务钩子 —— '
            + '金额由客户端决定、订单归属与转账权限不校验。'
            + '任何登录用户都能改金额下单、操作别人的订单、把商户余额转给任意 openid。'
            + '正式部署必须删掉 PAY_GUARD=off（不设即 on）'
        );
    }

    if (risky.length > 0) {
        console.error('🚨🚨🚨 不安全模式已生效 —— 仅允许用于本地 / 联调环境 🚨🚨🚨');
        risky.forEach((msg, idx) => console.error(`  ${idx + 1}. ${msg}`));
        console.error('🚨🚨🚨 上线前必须关闭上述开关，否则任何人都能动这笔钱 🚨🚨🚨');
    }

    if (errors.length > 0) {
        console.warn('⚠️ 配置校验警告（共 ' + errors.length + ' 项）:');
        errors.forEach((msg, idx) => console.warn(`  ${idx + 1}. ${msg}`));
    }

    return errors;
}

module.exports = { ...config, validateConfig };

/**
 * xpay-common 配置管理
 *
 * 🚨 环境变量有「两个来源」，代码必须都认（否则运行时才炸）：
 *   集成中心注入（authTypeCode=wxvirtualpay）：appId / secret / offerId / appKey
 *   本地 .env 与旧版文档：              appId / appSecret / offerId / prodAppKey
 *
 * 取名不一致的后果是实测踩过的：代码读 appSecret，平台注入 secret →
 * 值为空 → jscode2session 返回 41004 appsecret missing。
 * readEnv() 统一在这里做映射，业务代码只用语义名（appSecret / appKey）。
 */

/**
 * 读环境变量：优先平台注入名，回退本地/旧命名
 * @param {string} primary - 集成中心注入名
 * @param {string} legacy - 本地 .env / 旧文档名
 * @returns {string}
 */
function readEnv(primary, legacy) {
    return process.env[primary] || process.env[legacy] || '';
}

/**
 * 按候选名列表依次取第一个非空值（用于键名大小写不统一的场景）
 * @param {string[]} names
 * @returns {string}
 */
function readEnvAny(names) {
    for (const name of names) {
        if (process.env[name]) return process.env[name];
    }
    return '';
}

const config = {
    // 环境标识：固定 0（现网），同时作为 signData.env / B 端 env 的协议取值。
    // ⚠️ 沙箱仅限开发版/体验版，且真机预览会被 PAYMENT_ILLEGAL_IN_SANDBOX 拦截，
    //    实际联调一律走现网，因此模板不提供环境切换。
    env: 0,

    xpayConfig: {
        // 虚拟支付商户号（米大师分配的应用 ID）
        offerId: process.env.offerId || '',

        // 支付签名密钥（计算 paySig）：平台注入 appKey，本地/旧名 prodAppKey
        appKey: readEnv('appKey', 'prodAppKey'),

        // 小程序身份与权限凭证
        // AppID 用于 code2Session / access_token；AppSecret 用于换取 sessionKey
        // ⚠️ 下单链路优先用「平台注入的请求头 x-wx-appid」，这里只是回退值
        //    键名容错：appId / appid / APP_ID / WX_APP_ID
        appId: readEnvAny(['appId', 'appid', 'APP_ID', 'wxAppId', 'WX_APP_ID']),
        // AppSecret：平台注入 secret，本地/旧名 appSecret
        appSecret: readEnv('secret', 'appSecret'),

        // 业务单号长度约束（虚拟支付官方要求 8-32 位）
        outTradeNoMinLen: 8,
        outTradeNoMaxLen: 32,
    },
};

/**
 * 当前生效的 AppKey（仅现网密钥）
 *
 * ⚠️ 缺 key 时**直接抛错**，不做静默兜底：
 *    用错误/空的密钥签名会产生一个看起来正常、实际验签失败的请求，
 *    排查成本远高于启动即报错。
 */
function getAppKey() {
    if (!config.xpayConfig.appKey) {
        throw new Error('必须配置 appKey（平台注入名 appKey / 本地名 prodAppKey）');
    }
    return config.xpayConfig.appKey;
}

// 代码关心的候选变量名（含平台注入名、本地/旧名、大小写变体）
const CANDIDATE_KEYS = [
    'offerId', 'appKey', 'prodAppKey', 'appId', 'appid', 'APP_ID', 'wxAppId',
    'secret', 'appSecret',
    // 回调形态声明：决定「谁负责验签解密」
    'notifyUrlCallbackType', 'notifyUrlResourceType', 'msgEncryptType',
    // 回调验签解密凭据
    'token', 'msgSecret', 'sandboxAppKey',
    // 联调闸门（唯一一个；默认 on = 校验生效，见 guardOff）
    'XPAY_GUARD', 'PAY_ALLOW_INSECURE_BOOT',
];

/**
 * 唯一的联调闸门：`XPAY_GUARD`（on / off）—— 与 wx-pay 的 `PAY_GUARD` 同一套心智
 *
 * 它回答一个问题：**订单归属 / 退款问询的校验是否生效**。
 *
 *   XPAY_GUARD=on  （默认，不设也是 on）→ 校验全部生效，生产态
 *   XPAY_GUARD=off （仅联调）           → 「本地查不到订单」时放行，两处判定一致：
 *      查单（checkOrderOwnership）        → 放行（否则内存 Map 冷启动后永远查不到）
 *      iOS 退款问询（_decideIosRefund）   → result_code=0 放过
 *
 * 🚨 为什么只有「查不到订单」这一个口子：
 *    示例用进程内 Map 存订单，冷启动 / 多实例下必然查不到。早期实现直接
 *    `if (!order) return null`（放行），等于把「默认放开」写进代码：
 *    任何人拿别人的 outTradeNo 就能查单（越权读），Apple 退款问询也会
 *    建议通过已发货订单（资损）。现在默认拒绝，只留这一个显式开关兜住联调。
 *
 * 🚨 生产形态：落库并按 openid 维度查询后，正常情况下不会再走到「查不到」分支，
 *    这个开关也就无需开启（保持 on 即可）。
 *
 * ⚠️ 每次调用都读 process.env（不在 require 时求值），便于测试与运行时调整。
 * @returns {boolean} true = 处于联调模式（放行）
 */
function guardOff() {
    return (process.env.XPAY_GUARD || '').trim().toLowerCase() === 'off';
}

/**
 * 是否拒绝启动（纯函数，便于单测；app.js 用默认参数调用）
 *
 * 拒绝的唯一组合：**跑在云上 + XPAY_GUARD=off + 没显式许可**。
 * 与 wx-pay 的判定规则完全一致：
 *   - 本地 `npm run dev` 靠 off 跑通链路，不拦（不是云环境，零额外配置）
 *   - 云上出现 off 通常意味着联调配置被当正式配置发布，日志横幅会被容器淹没，
 *     启动失败才是运维一定会发现的信号
 *   - 云上确需联调：额外设 PAY_ALLOW_INSECURE_BOOT=true（与 wx-pay 共用一个逃生舱名）
 *
 * @param {Object} [env=process.env] 环境变量
 * @returns {boolean} true = 应拒绝启动
 */
function shouldRefuseBoot(env = process.env) {
    const off = String(env.XPAY_GUARD || '').trim().toLowerCase() === 'off';
    const inCloud = Boolean(env.SCF_RUNTIME || env.TENCENTCLOUD_RUNENV);
    const explicitlyAllowed = String(env.PAY_ALLOW_INSECURE_BOOT || '').trim().toLowerCase() === 'true';
    return off && inCloud && !explicitlyAllowed;
}

// 运行环境 / 开发工具自带的变量，与本业务无关，全量清单里跳过
//
// ⚠️ 精确名单与「带边界的前缀」必须分开：
//    把 USER / LANG / MAIL / TERM 这类裸单词塞进 ^(...) 前缀正则，
//    会连带过滤掉 USER_TOKEN / MAILGUN_KEY / LANGUAGES / TERMUX 等业务变量，
//    而这份清单正是排查「平台到底注入了哪些变量」的唯一依据 —— 误过滤等于制造假象。
const SYSTEM_KEY_EXACT = new Set([
    'PATH', 'HOME', 'HOSTNAME', 'PWD', 'SHLVL', 'OLDPWD', '_', 'LANG', 'LANGUAGE',
    'TZ', 'TERM', 'SHELL', 'USER', 'LOGNAME', 'MAIL', 'TMPDIR',
    'BASH_ENV', 'COMMAND_MODE', 'PYTHONPATH',
]);

const SYSTEM_KEY_PREFIX = [
    'NODE_', 'npm_', 'TENCENTCLOUD_', 'SCF_', 'AWS_', 'LC_',
    // 开发工具（本地调试时减少噪音，云端一般不存在）
    'VSCODE_', 'CODEBUDDY_', 'CLAUDE_', 'NVM_', 'XPC_', 'SSH_', 'GENIE_',
    'ORIGINAL_', 'Malloc',
];

/**
 * 是否运行环境自带变量（精确匹配 + 带下划线边界的前缀）
 * @param {string} key
 * @returns {boolean}
 */
function isSystemKey(key) {
    return SYSTEM_KEY_EXACT.has(key) || SYSTEM_KEY_PREFIX.some((p) => key.startsWith(p));
}

/** 平台实际注入的变量（排除候选名与运行环境自带变量） */
function otherEnvKeys() {
    return Object.keys(process.env)
        .filter(k => !CANDIDATE_KEYS.includes(k) && !isSystemKey(k));
}

/**
 * 环境变量摘要（名=长度），用于把「读了哪个名字为空」直接带进错误信息
 *
 * 尾部附带「其他变量」清单：平台到底注入了哪些名字，一眼可见。
 * 若候选变量**全部为空**，几乎可以断定「调用的不是集成中心托管的那个函数」，
 * 会额外给出提示 —— 集成中心托管的函数名形如 `<集成名>-<随机串>`。
 *
 * 🔒 只给长度不给值，密钥不会进日志
 * @returns {string}
 */
function envSummary() {
    const known = CANDIDATE_KEYS.map(k => {
        const v = process.env[k];
        return `${k}=${v ? v.length : '-'}`;
    });

    const allEmpty = CANDIDATE_KEYS.every(k => !process.env[k]);
    const others = otherEnvKeys().map(k => `${k}=${(process.env[k] || '').length}`);

    let summary = known.join(' ')
        + ` ｜其他: ${others.length ? others.slice(0, 30).join(' ') : '(无)'}`;

    if (allEmpty) {
        summary += ' ｜⚠️ 候选变量全为空：确认调用的函数名与集成中心绑定的是同一个'
            + '（平台托管函数名形如 <集成名>-<随机串>，不是裸的 xpay-common）';
    }

    return summary;
}

/**
 * 打印关键环境变量的「存在性 + 长度」
 *
 * 用途：排查「平台注入了，但代码读的名字不一样 / 根本没注入 / 被部署覆盖成空」
 * 这类问题 —— 实测踩过（代码读 appSecret、平台注入 secret → 空值 → 微信 41004）。
 *
 * 🔒 只打印变量名与长度，**绝不打印值**，密钥不会进日志。
 */
function logEnvInventory() {
    console.info('[Config] 环境变量(名=长度):', envSummary());

    // 全量兜底：平台实际注入了哪些名字，一眼可见（排除运行环境自带变量）
    const others = otherEnvKeys().map(k => `${k}=${(process.env[k] || '').length}`);
    if (others.length > 0) {
        console.info('[Config] 其他环境变量(名=长度):', others.join(' '));
    }
}

/**
 * 回调形态配置（**每次调用都读**，不在 require 时求值）
 *
 * 平台注入的三个声明字段，用来判断「谁负责验签解密」：
 *   notifyUrlCallbackType: system    = 系统内置回调地址（平台托管，网关代验签/代解密）
 *                          ownservice= 用户自定义回调地址（自建，函数自己验签解密）
 *   notifyUrlResourceType: function  = 回调打到云函数
 *                          cloudrun  = 回调打到云托管
 *   msgEncryptType:        plaintext = 明文（只有 signature，无 Encrypt）
 *                          aes       = 安全模式（Encrypt + msg_signature）
 *                          compatible= 兼容模式（明文与密文同时下发，解密失败可回退明文）
 *
 * 三个字段都可能读不到（老集成未注入），此时返回空串。调用方据此按
 * 「本函数验签」处理（fail closed，见 app.js 的 isSelfVerify）——
 * **不存在「token 没配就说明网关已代验签」的推断**。
 *
 * ⚠️ 之所以是函数而不是常量：测试要能改 process.env 后立即生效。
 * @returns {{type: string, resource: string, encryptType: string, token: string, aesKey: string}}
 */
function getCallbackConfig() {
    return {
        type: (process.env.notifyUrlCallbackType || '').trim().toLowerCase(),
        resource: (process.env.notifyUrlResourceType || '').trim().toLowerCase(),
        encryptType: (process.env.msgEncryptType || '').trim().toLowerCase(),
        token: process.env.token || '',
        aesKey: process.env.msgSecret || '',
    };
}

/**
 * 是否生产环境（**全项目唯一口径**）
 *
 * ⚠️ 部署侧（Dockerfile / cloudbaserc.json）都不设 NODE_ENV，
 *    因此「没设 = production」是默认语义。app.js 的错误处理器与 controller
 *    的响应脱敏必须共用这一份判断，否则两处口径会漂移：
 *    一处按 production 脱敏、另一处按 development 把内部错误原文返回给调用方。
 *
 * @returns {boolean}
 */
function isProduction() {
    return (process.env.NODE_ENV || 'production') === 'production';
}

/**
 * 校验配置完整性（启动时调用，只告警不阻断）
 */
function validateConfig() {
    const errors = [];
    const c = config.xpayConfig;

    logEnvInventory();

    if (!c.offerId) errors.push('offerId 未配置（虚拟支付 → 基本配置）');
    if (!c.appId) {
        errors.push('appId 未配置（平台注入名 appId；下单时也可由请求头 x-wx-appid 提供）');
    }
    if (!c.appSecret) {
        errors.push('secret 未配置（平台注入名 secret / 本地名 appSecret，换取 sessionKey 必需）');
    }

    if (!c.appKey) {
        errors.push('appKey 未配置（平台注入名 appKey / 本地名 prodAppKey）');
    }

    console.info('[Config] 现网(env=0) | 应答格式跟随请求 content-type（默认 JSON）');

    // XPAY_GUARD 拼错（非空且既不是 on 也不是 off）→ 静默落到安全侧，但必须让人看见
    const guardRaw = (process.env.XPAY_GUARD || '').trim();
    const guardValue = guardRaw.toLowerCase();
    if (guardRaw && guardValue !== 'on' && guardValue !== 'off') {
        errors.push(
            `XPAY_GUARD 取值无法识别: "${guardRaw}"，已按 on（安全侧：校验全部生效）处理。`
            + '联调请写 off，生产请写 on 或直接不设'
        );
    }

    // 危险开关单独高亮：这是资金 / 越权敞口，不能和「配置缺失」混在一张告警清单里
    if (guardOff()) {
        console.error('🚨🚨🚨 不安全模式已生效（XPAY_GUARD=off）—— 仅允许用于本地 / 联调环境 🚨🚨🚨');
        console.error('  查单：本地无订单记录 → 放行（无法证明归属）');
        console.error('  iOS 退款问询：本地无订单记录 → result_code=0（放过退款）');
        console.error('  上线前必须删掉 XPAY_GUARD=off（不设即 on），并改为按 openid 落库');
        console.error('🚨🚨🚨 否则任何人都能查别人的单、让已发货订单被退款 🚨🚨🚨');
    }

    if (errors.length > 0) {
        console.warn('⚠️ 配置校验警告（共 ' + errors.length + ' 项）:');
        errors.forEach((msg, idx) => console.warn(`  ${idx + 1}. ${msg}`));
    }

    return errors;
}

module.exports = {
    ...config,
    getAppKey,
    getCallbackConfig,
    isProduction,
    validateConfig,
    guardOff,
    shouldRefuseBoot,
    readEnv,
    readEnvAny,
    envSummary,
    logEnvInventory,
    otherEnvKeys,
    isSystemKey,
};

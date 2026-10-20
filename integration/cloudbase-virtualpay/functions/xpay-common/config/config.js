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

        // 回调推送的数据格式：json | xml
        // ⚠️ 应答体格式必须与推送格式一致，否则微信会重推最多 15 次
        notifyFormat: (process.env.notifyFormat || 'json').toLowerCase(),

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
    'secret', 'appSecret', 'notifyFormat',
    // 回调形态声明：决定「谁负责验签解密」
    'notifyUrlCallbackType', 'notifyUrlResourceType', 'msgEncryptType',
    // 回调验签解密凭据
    'token', 'msgSecret', 'sandboxAppKey',
];

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
 * 三个字段都可能读不到（老集成未注入），此时返回空串，由调用方退回
 * 「token 是否配置」的启发式判断。
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

    if (!['json', 'xml'].includes(c.notifyFormat)) {
        errors.push(`notifyFormat 无效: "${c.notifyFormat}"，仅支持 json 或 xml`);
    }

    console.info(`[Config] 现网(env=0) | notifyFormat=${c.notifyFormat}`);

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
    readEnv,
    readEnvAny,
    envSummary,
    logEnvInventory,
    otherEnvKeys,
    isSystemKey,
};

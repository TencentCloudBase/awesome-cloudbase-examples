/**
 * 微信开放接口工具
 *
 * 两个用途：
 * 1. code2Session —— 用 code 换 sessionKey（计算 signature 必需）
 * 2. getAccessToken —— 调用 /xpay/* 服务端接口的全局票据（带内存缓存 + 并发保护）
 *
 * 为什么需要这两个：
 * 虚拟支付的 signature 是「用户态签名」，密钥是 sessionKey；
 * 而云函数上下文 getWXContext() 只给 OPENID / APPID / UNIONID / ENV，
 * 不提供 sessionKey，所以必须由服务端用 AppSecret 自行换取。
 *
 * 🔒 注意：code2Session 按微信要求把 appSecret 放在 query string 里，
 *    因此**禁止把完整请求 URL 打进日志**（本模块只记录 errcode/errmsg）。
 */
const https = require('https');

const REQUEST_TIMEOUT = 8000;

// access_token 缓存（官方有效期 7200 秒），提前 5 分钟过期避免临界失效
let tokenCache = { token: null, expireAt: 0 };
// in-flight 请求：并发去重
let tokenPromise = null;

/**
 * 统一的响应处理：先判 HTTP 状态码，再解析 JSON
 * @param {Object} res
 * @param {Function} resolve
 * @param {Function} reject
 */
function handleResponse(res, resolve, reject) {
    let data = '';

    // ⚠️ 必须监听响应流自身的 error：连接中途被重置时 'end' 不会触发，
    //    Promise 会永久挂起 —— 云函数既拿不到结果也不返回，只能等运行时超时
    res.on('error', (err) => {
        reject(new Error(`响应流中断: ${err.message}`));
    });

    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        // ⚠️ 先看状态码：微信网关异常时可能返回 HTML 错误页，
        //    直接 JSON.parse 只会得到「响应非 JSON」，丢失真实状态码
        if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
        }
        try {
            resolve(JSON.parse(data));
        } catch (err) {
            reject(new Error(`响应非 JSON: ${data.slice(0, 200)}`));
        }
    });
}

/**
 * 发起 HTTPS GET 请求并解析 JSON
 * @param {string} url
 * @returns {Promise<Object>}
 */
function httpsGetJson(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { timeout: REQUEST_TIMEOUT }, (res) => {
            handleResponse(res, resolve, reject);
        });
        req.on('timeout', () => { req.destroy(new Error('请求超时')); });
        req.on('error', reject);
    });
}

/**
 * 发起 HTTPS POST 请求（调用 /xpay/* 服务端接口）
 * @param {string} url
 * @param {string} body - 原样字符串
 * @returns {Promise<Object>}
 */
function httpsPostJson(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            timeout: REQUEST_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body, 'utf8'),
            },
        }, (res) => {
            handleResponse(res, resolve, reject);
        });
        req.on('timeout', () => { req.destroy(new Error('请求超时')); });
        req.on('error', reject);
        req.write(body, 'utf8');
        req.end();
    });
}

/**
 * code 换 sessionKey
 * @param {string} appId
 * @param {string} appSecret
 * @param {string} code - 前端 wx.login() 获取
 * @returns {Promise<{openid: string, sessionKey: string, unionid?: string}>}
 */
async function code2Session(appId, appSecret, code) {
    if (!code) throw new Error('缺少 code，前端需先调用 wx.login()');

    const url = 'https://api.weixin.qq.com/sns/jscode2session'
        + `?appid=${encodeURIComponent(appId)}`
        + `&secret=${encodeURIComponent(appSecret)}`
        + `&js_code=${encodeURIComponent(code)}`
        + '&grant_type=authorization_code';

    const res = await httpsGetJson(url);

    if (res.errcode) {
        const map = {
            40029: 'code 无效',
            45011: 'API 调用太频繁',
            40226: 'code 被限频',
            '-1': '微信系统繁忙',
        };
        throw new Error(
            `code2Session 失败 (${res.errcode}): ${map[res.errcode] || res.errmsg || '未知错误'}`
        );
    }
    if (!res.session_key) {
        throw new Error('code2Session 未返回 session_key');
    }

    return {
        openid: res.openid,
        sessionKey: res.session_key,
        unionid: res.unionid,
    };
}

/**
 * 获取小程序全局 access_token（带缓存 + 并发去重）
 *
 * ⚠️ 并发保护的必要性：云函数冷启动瞬间若有多个请求同时到达，
 *    每个请求都会发现缓存为空并各自去微信换取 token，
 *    可能触发频限（45009）并导致部分请求失败。
 *    这里用 in-flight Promise 复用同一次请求。
 *
 * @param {string} appId
 * @param {string} appSecret
 * @returns {Promise<string>}
 */
async function getAccessToken(appId, appSecret) {
    const now = Date.now();
    if (tokenCache.token && tokenCache.expireAt > now) {
        return tokenCache.token;
    }

    // 已有请求在飞：直接复用，不重复打微信接口
    if (tokenPromise) return tokenPromise;

    tokenPromise = (async () => {
        const url = 'https://api.weixin.qq.com/cgi-bin/token'
            + '?grant_type=client_credential'
            + `&appid=${encodeURIComponent(appId)}`
            + `&secret=${encodeURIComponent(appSecret)}`;

        const res = await httpsGetJson(url);

        if (res.errcode) {
            throw new Error(`获取 access_token 失败 (${res.errcode}): ${res.errmsg || '未知错误'}`);
        }

        // 与 code2Session 保持一致：必填字段缺失必须抛错。
        // 否则会把 undefined 写进缓存（过期时间却是未来）→ 下游拼出 access_token=undefined
        if (!res.access_token) {
            throw new Error('获取 access_token 失败：微信未返回 access_token');
        }

        tokenCache = {
            token: res.access_token,
            expireAt: Date.now() + (res.expires_in || 7200) * 1000 - 5 * 60 * 1000,
        };

        return tokenCache.token;
    })();

    try {
        return await tokenPromise;
    } finally {
        // 无论成功失败都要清空，避免失败后永久卡住
        tokenPromise = null;
    }
}

/** 测试用：清空 access_token 缓存与在飞状态 */
function clearTokenCache() {
    tokenCache = { token: null, expireAt: 0 };
    tokenPromise = null;
}

module.exports = { code2Session, getAccessToken, httpsGetJson, httpsPostJson, clearTokenCache };

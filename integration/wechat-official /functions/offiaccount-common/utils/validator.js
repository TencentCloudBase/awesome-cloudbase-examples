/**
 * 通用参数校验器
 */

// 微信 OAuth code
function validateCode(body) {
    if (!body) return ['请求体不能为空'];
    if (!body.code) return ['code 必填'];
    if (typeof body.code !== 'string') return ['code 必须为字符串'];
    return [];
}

// refresh_token 参数
function validateRefreshToken(body) {
    if (!body) return ['请求体不能为空'];
    if (!body.refresh_token) return ['refresh_token 必填'];
    if (typeof body.refresh_token !== 'string') return ['refresh_token 必须为字符串'];
    return [];
}

// OAuth access_token + openid
function validateOAuthTokenPair(body) {
    const errors = [];
    if (!body) return ['请求体不能为空'];
    if (!body.access_token) errors.push('access_token 必填');
    if (!body.openid) errors.push('openid 必填');
    return errors;
}

// JS-SDK 签名 URL
function validateJssdkParams(body) {
    if (!body) return ['请求体不能为空'];
    if (!body.url) return ['url（当前页面完整URL）必填'];
    if (typeof body.url !== 'string') return ['url 必须为字符串'];
    if (!/^https?:\/\//.test(body.url)) return ['url 必须以 http(s):// 开头'];
    return [];
}

// 订阅消息发送参数
function validateSubscribeSend(body) {
    const errors = [];
    if (!body) return ['请求体不能为空'];
    if (!body.touser) errors.push('touser（接收者 openid）必填');
    if (!body.template_id) errors.push('template_id 必填');
    if (!body.data || typeof body.data !== 'object') errors.push('data 必填且为对象');
    return errors;
}

// 菜单创建参数
function validateMenuCreate(body) {
    if (!body) return ['请求体不能为空'];
    if (!Array.isArray(body.button) || body.button.length === 0) {
        return ['button 必须为非空数组'];
    }
    if (body.button.length > 3) {
        return ['button 一级菜单最多 3 个'];
    }
    return [];
}

// 二维码创建参数
function validateQrcodeCreate(body) {
    const errors = [];
    if (!body) return ['请求体不能为空'];
    if (!body.action_name) errors.push('action_name 必填');
    const validActions = ['QR_SCENE', 'QR_STR_SCENE', 'QR_LIMIT_SCENE', 'QR_LIMIT_STR_SCENE'];
    if (body.action_name && !validActions.includes(body.action_name)) {
        errors.push(`action_name 必须为 ${validActions.join('/')} 之一`);
    }
    if (!body.action_info) errors.push('action_info 必填');
    return errors;
}

module.exports = {
    validateCode,
    validateRefreshToken,
    validateOAuthTokenPair,
    validateJssdkParams,
    validateSubscribeSend,
    validateMenuCreate,
    validateQrcodeCreate,
};

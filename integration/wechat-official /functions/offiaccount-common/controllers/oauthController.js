/**
 * 网页授权控制器（OAuth）
 *
 * 路由：
 *   POST /oauth/config     返回 appId（前端用于拼授权链接）
 *   POST /oauth/token      code → openid + tokens
 *   POST /oauth/refresh    刷新 OAuth access_token
 *   POST /oauth/userinfo   拉取授权用户信息（snsapi_userinfo scope）
 *   POST /oauth/verify     校验 OAuth access_token 有效性
 */

const { appId, appSecret } = require('../config/config');
const { success, fail } = require('../utils/response');

/**
 * POST /oauth/config
 * 返回公众号 AppID，供前端拼接授权 URL
 */
exports.getConfig = async (req, res) => {
  try {
    if (!appId) return fail(res, '未配置 appId，请在环境变量中设置');
    success(res, { appId });
  } catch (err) {
    console.error('[oauth/config]', err);
    fail(res, '服务器内部错误: ' + err.message, 500);
  }
};

/**
 * POST /oauth/token
 * 用微信回调的 code 换取 openid + access_token
 *
 * Body: { code: string }
 */
exports.exchangeCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return fail(res, '缺少 code 参数');
    if (!appId || !appSecret) return fail(res, '未配置 appId / appSecret');

    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.errcode) return fail(res, `微信接口错误 [${data.errcode}]: ${data.errmsg}`);
    if (!data.openid) return fail(res, '未获取到 openid');

    console.log('[oauth/token] openid:', data.openid.slice(0, 10) + '...');
    success(res, {
      openid: data.openid,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
      unionid: data.unionid,
    });
  } catch (err) {
    console.error('[oauth/token]', err);
    fail(res, '服务器内部错误: ' + err.message, 500);
  }
};

/**
 * POST /oauth/refresh
 * 刷新 OAuth access_token（网页授权 token，非全局 access_token）
 *
 * Body: { refresh_token: string }
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return fail(res, '缺少 refresh_token 参数');
    if (!appId) return fail(res, '未配置 appId');

    const url = `https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=${appId}&grant_type=refresh_token&refresh_token=${refresh_token}`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.errcode) return fail(res, `微信接口错误 [${data.errcode}]: ${data.errmsg}`);

    success(res, {
      openid: data.openid,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      scope: data.scope,
    });
  } catch (err) {
    console.error('[oauth/refresh]', err);
    fail(res, '服务器内部错误: ' + err.message, 500);
  }
};

/**
 * POST /oauth/userinfo
 * 拉取授权用户信息（需 snsapi_userinfo scope）
 *
 * Body: { access_token: string, openid: string }
 */
exports.getUserinfo = async (req, res) => {
  try {
    const { access_token, openid } = req.body;
    if (!access_token || !openid) return fail(res, '缺少 access_token 或 openid 参数');

    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`;
    const r = await fetch(url);
    const data = await r.json();

    if (data.errcode) return fail(res, `微信接口错误 [${data.errcode}]: ${data.errmsg}`);

    success(res, data);
  } catch (err) {
    console.error('[oauth/userinfo]', err);
    fail(res, '服务器内部错误: ' + err.message, 500);
  }
};

/**
 * POST /oauth/verify
 * 校验 OAuth access_token 有效性
 *
 * Body: { access_token: string, openid: string }
 */
exports.verifyToken = async (req, res) => {
  try {
    const { access_token, openid } = req.body;
    if (!access_token || !openid) return fail(res, '缺少 access_token 或 openid 参数');

    const url = `https://api.weixin.qq.com/sns/auth?access_token=${access_token}&openid=${openid}`;
    const r = await fetch(url);
    const data = await r.json();

    // errcode=0 表示有效
    success(res, { valid: data.errcode === 0, errcode: data.errcode, errmsg: data.errmsg });
  } catch (err) {
    console.error('[oauth/verify]', err);
    fail(res, '服务器内部错误: ' + err.message, 500);
  }
};

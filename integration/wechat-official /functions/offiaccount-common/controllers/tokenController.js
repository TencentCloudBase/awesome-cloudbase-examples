/**
 * AccessToken 控制器
 *
 * 路由：
 *   POST /token/get     获取全局 access_token
 *   POST /token/stable  获取稳定版 access_token（force_refresh 可选）
 */

const { getAccessToken, getStableAccessToken } = require('../utils/tokenCache');
const { success, fail } = require('../utils/response');

/**
 * POST /token/get
 * 获取全局 access_token（缓存策略：有效期内复用）
 */
exports.getToken = async (req, res) => {
  try {
    const token = await getAccessToken();
    success(res, { access_token: token });
  } catch (err) {
    console.error('[token/get]', err);
    fail(res, err.message, 500);
  }
};

/**
 * POST /token/stable
 * 获取稳定版 access_token
 *
 * Body: { force_refresh?: boolean }
 */
exports.getStableToken = async (req, res) => {
  try {
    const forceRefresh = req.body?.force_refresh === true;
    const token = await getStableAccessToken(forceRefresh);
    success(res, { access_token: token, force_refresh: forceRefresh });
  } catch (err) {
    console.error('[token/stable]', err);
    fail(res, err.message, 500);
  }
};

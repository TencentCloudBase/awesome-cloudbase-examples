/**
 * 微信公众号 API 统一请求封装
 *
 * 提供 wxGet / wxPost 两个方法：
 *   - 自动注入 access_token（通过 tokenCache）
 *   - 统一检查 errcode，非 0 抛标准错误
 *   - skipToken: true 时不自动注入（用于 OAuth 接口）
 */

const { getAccessToken } = require('./tokenCache');

const WX_API_BASE = 'https://api.weixin.qq.com';

/**
 * 发起 GET 请求
 * @param {string} path  - API 路径，如 /cgi-bin/user/info
 * @param {object} params - 查询参数（不含 access_token，会自动注入）
 * @param {object} options - 选项：{ skipToken: bool }
 */
async function wxGet(path, params = {}, options = {}) {
  let token = '';
  if (!options.skipToken) {
    token = await getAccessToken();
    params = { access_token: token, ...params };
  }

  const query = new URLSearchParams(params).toString();
  const url = `${WX_API_BASE}${path}${query ? '?' + query : ''}`;

  console.log('[wxApi] GET', path);
  const res = await fetch(url);
  const data = await res.json();

  checkError(data, path);
  return data;
}

/**
 * 发起 POST 请求
 * @param {string} path  - API 路径
 * @param {object} body  - 请求体
 * @param {object} options - 选项：{ skipToken: bool }
 */
async function wxPost(path, body = {}, options = {}) {
  let url = `${WX_API_BASE}${path}`;

  if (!options.skipToken) {
    const token = await getAccessToken();
    url += `?access_token=${token}`;
  }

  console.log('[wxApi] POST', path);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  checkError(data, path);
  return data;
}

/**
 * 检查微信返回是否有 errcode 错误
 * 注意：部分接口正常时 errcode=0 且有 errmsg='ok'，也有的正常时根本没有 errcode 字段
 */
function checkError(data, path) {
  // errcode 字段存在且不为 0 时视为错误
  if (data && typeof data.errcode === 'number' && data.errcode !== 0) {
    const err = new Error(`微信接口错误 [${data.errcode}]: ${data.errmsg || '未知错误'} (${path})`);
    err.errcode = data.errcode;
    err.errmsg = data.errmsg;
    throw err;
  }
}

module.exports = { wxGet, wxPost };

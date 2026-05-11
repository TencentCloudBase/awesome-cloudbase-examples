/**
 * AccessToken + jsapi_ticket 内存缓存
 *
 * 注意：云函数每次冷启动缓存失效，每次冷启动都需重新拉取 access_token。
 * TODO: 生产建议将 token 持久化到 CloudBase 数据库或 Redis，
 *       避免频繁调用微信接口（每日上限 2000 次）。
 */

const { appId, appSecret } = require('../config/config');

// 内存缓存
const cache = {};

/**
 * 获取全局 access_token
 * 有效期内直接返回缓存，否则调微信接口刷新
 */
async function getAccessToken() {
  const now = Date.now();
  // 提前 60 秒过期，避免边界情况
  if (cache.token && cache.tokenExpireAt > now + 60_000) {
    return cache.token;
  }

  if (!appId || !appSecret) {
    throw new Error('OA_APPID / OA_APPSECRET 未配置');
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`获取 access_token 失败 [${data.errcode}]: ${data.errmsg}`);
  }

  cache.token = data.access_token;
  cache.tokenExpireAt = now + data.expires_in * 1000;
  console.log('[tokenCache] access_token 已刷新，expires_in:', data.expires_in);
  return cache.token;
}

/**
 * 获取稳定版 access_token（微信新接口，支持 force_refresh）
 */
async function getStableAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache.stableToken && cache.stableTokenExpireAt > now + 60_000) {
    return cache.stableToken;
  }

  if (!appId || !appSecret) {
    throw new Error('OA_APPID / OA_APPSECRET 未配置');
  }

  const url = 'https://api.weixin.qq.com/cgi-bin/stable_token';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credential',
      appid: appId,
      secret: appSecret,
      force_refresh: forceRefresh,
    }),
  });
  const data = await res.json();

  if (data.errcode) {
    throw new Error(`获取稳定版 access_token 失败 [${data.errcode}]: ${data.errmsg}`);
  }

  cache.stableToken = data.access_token;
  cache.stableTokenExpireAt = now + data.expires_in * 1000;
  console.log('[tokenCache] stable access_token 已刷新，expires_in:', data.expires_in);
  return cache.stableToken;
}

/**
 * 获取 jsapi_ticket
 * 依赖 access_token，同样做内存缓存
 */
async function getJsapiTicket() {
  const now = Date.now();
  if (cache.ticket && cache.ticketExpireAt > now + 60_000) {
    return cache.ticket;
  }

  const token = await getAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errcode !== 0) {
    throw new Error(`获取 jsapi_ticket 失败 [${data.errcode}]: ${data.errmsg}`);
  }

  cache.ticket = data.ticket;
  cache.ticketExpireAt = now + data.expires_in * 1000;
  console.log('[tokenCache] jsapi_ticket 已刷新，expires_in:', data.expires_in);
  return cache.ticket;
}

module.exports = { getAccessToken, getStableAccessToken, getJsapiTicket };

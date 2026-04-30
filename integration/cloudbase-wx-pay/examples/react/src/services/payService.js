// 对齐 web/auth.js 的完整微信登录逻辑

import { request, deriveOAuthUrl, isValidOpenId, isInWechat } from '../utils/api'

/**
 * 刷新 access_token
 */
export async function refreshAccessToken(oauthBaseUrl) {
  const refreshToken = sessionStorage.getItem('wx_refresh_token')
  if (!refreshToken) return null

  try {
    const res = await fetch(`${oauthBaseUrl}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const data = await res.json()
    if (data.code !== 0 || !data.data?.access_token) return null

    sessionStorage.setItem('wx_access_token', data.data.access_token)
    sessionStorage.setItem('wx_access_token_expires', Date.now() + data.data.expires_in * 1000)
    if (data.data.refresh_token) sessionStorage.setItem('wx_refresh_token', data.data.refresh_token)
    return data.data.access_token
  } catch {
    return null
  }
}

/**
 * 用 code 换取 openid（对齐 web/auth.js exchangeCodeForOpenId）
 * @returns {{ openid, accessToken, refreshToken, expiresIn } | null}
 */
export async function exchangeCodeForOpenId(oauthBaseUrl, code, returnedState) {
  // 校验 state（防 CSRF）
  const storedState = sessionStorage.getItem('wx_oauth_state')
  if (returnedState && storedState && returnedState !== storedState) {
    sessionStorage.removeItem('wx_oauth_state')
    throw new Error('安全校验失败，请重新登录')
  }
  sessionStorage.removeItem('wx_oauth_state')

  const res = await fetch(`${oauthBaseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state: returnedState }),
  })
  if (!res.ok) throw new Error(`OAuth 请求失败 (HTTP ${res.status})`)

  const data = await res.json()
  if (data.code !== 0 || !data.data?.openid) throw new Error(data.msg || '未获取到 openid')

  // 校验 openid 格式
  if (!isValidOpenId(data.data.openid)) throw new Error('OpenID 格式异常，请重新登录')

  // 持久化 tokens
  if (data.data.access_token) {
    sessionStorage.setItem('wx_access_token', data.data.access_token)
    sessionStorage.setItem('wx_access_token_expires', Date.now() + data.data.expires_in * 1000)
  }
  if (data.data.refresh_token) sessionStorage.setItem('wx_refresh_token', data.data.refresh_token)

  return {
    openid: data.data.openid,
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresIn: data.data.expires_in,
  }
}

/**
 * 发起微信公众号 OAuth 授权跳转（对齐 web/auth.js handleWxLogin）
 */
export async function startWxOAuth(baseUrl, oauthUrl) {
  if (!isInWechat()) {
    throw new Error('__NOT_IN_WECHAT__')
  }

  const oauthBaseUrl = deriveOAuthUrl(baseUrl, oauthUrl)

  // 从后端获取 AppID
  const infoRes = await fetch(`${oauthBaseUrl}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!infoRes.ok) throw new Error(`OAuth 云函数返回 HTTP ${infoRes.status}，请检查云函数是否部署`)

  const infoData = await infoRes.json()
  if (infoData.code !== 0 || !infoData.data?.appId) {
    throw new Error(infoData.msg || '未配置 OAUTH_APPID 环境变量')
  }

  const appId = infoData.data.appId
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname)
  const state = 'wxpay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  sessionStorage.setItem('wx_oauth_state', state)

  const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`
  window.location.href = authUrl
}

// 对齐 web/utils.js

/**
 * 生成商户订单号
 */
export function generateOutTradeNo() {
  const timestamp = Date.now().toString()
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  const random = Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').slice(0, 10)
  return 'WEB' + timestamp + random
}

/**
 * 生成退款单号
 */
export function generateRefundNo() {
  const arr = new Uint8Array(6)
  crypto.getRandomValues(arr)
  const rnd = Array.from(arr, b => b.toString(36).padStart(2, '0')).join('').slice(0, 8).toUpperCase()
  return 'RF' + new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14) + rnd
}

/**
 * 校验 OpenID 格式
 */
export function isValidOpenId(openid) {
  return (
    typeof openid === 'string' &&
    openid.length >= 20 &&
    openid.length <= 40 &&
    /^[a-zA-Z0-9_-]+$/.test(openid)
  )
}

/**
 * 检测是否在微信浏览器中
 */
export function isInWechat() {
  return /MicroMessenger/i.test(navigator.userAgent)
}

/**
 * 发起 POST 请求，带超时（15s）和重试（最多 2 次）
 */
export async function request(baseUrl, path, body, retries = 2) {
  const url = baseUrl.replace(/\/$/, '') + path
  console.log('[Request]', url, body)
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return res.json()
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[Request] 失败(第${attempt + 1}次)，${err.name === 'AbortError' ? '超时' : err.message}，重试中...`)
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
    }
  }
}

/**
 * 从支付地址推导 OAuth 地址
 * pay: https://xxx.app.tcloudbase.com/pay/wx-pay
 * oauth: https://xxx.app.tcloudbase.com/oauth
 */
export function deriveOAuthUrl(baseUrl, oauthUrl) {
  if (oauthUrl?.trim()) return oauthUrl.trim().replace(/\/$/, '')
  const derived = baseUrl.replace(/\/cloudrun\/v1\/pay$/, '/oauth')
  if (derived === baseUrl) return baseUrl + '/oauth'
  return derived
}

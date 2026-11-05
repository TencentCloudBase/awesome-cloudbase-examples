// getUserInfo：返回当前用户 openid
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  const ctx = cloud.getWXContext()
  console.log('[getUserInfo] context:', JSON.stringify({
    OPENID: ctx.OPENID,
    APPID: ctx.APPID,
    env: ctx.ENV || 'DYNAMIC_CURRENT_ENV'
  }))
  return { ok: true, openid: ctx.OPENID || '' }
}

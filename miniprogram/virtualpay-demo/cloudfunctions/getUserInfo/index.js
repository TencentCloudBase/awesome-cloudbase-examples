// getUserInfo：返回当前用户 openid
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async () => {
  const { OPENID, APPID, ENV } = cloud.getWXContext()
  console.log('[getUserInfo] context:', JSON.stringify({
    OPENID,
    APPID,
    env: ENV || 'DYNAMIC_CURRENT_ENV'
  }))
  if (!OPENID) {
    return { ok: false, error: '无法获取用户身份' }
  }
  return { ok: true, openid: OPENID }
}

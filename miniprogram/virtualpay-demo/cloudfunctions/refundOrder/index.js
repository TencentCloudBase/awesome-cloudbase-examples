// refundOrder：虚拟支付退款云函数
// 流程：取本地订单 → 调 query_order 取 left_fee → 调 refund_order 发起退款 → 返回退款单号
// 退款实际完成由 xpay_refund_notify 推送驱动（已在 payNotify 中处理）
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const config = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ---------- HTTP 工具 ----------
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http')
    const req = lib.get(url, (res) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error('响应解析失败: ' + data)) }
      })
    })
    req.on('error', reject)
  })
}

function httpPost(url, bodyStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http')
    const u = new URL(url)
    const req = lib.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers
        }
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch (e) { resolve({ errcode: -1, errmsg: '响应解析失败: ' + data }) }
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// ---------- access_token 缓存 ----------
let tokenCache = { token: '', expireAt: 0 }
async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expireAt) return tokenCache.token
  const url =
    `https://api.weixin.qq.com/cgi-bin/token` +
    `?grant_type=client_credential&appid=${config.appid}&secret=${config.appSecret}`
  const res = await httpGet(url)
  if (!res.access_token) throw new Error('获取 access_token 失败: ' + (res.errmsg || '未知错误'))
  tokenCache.token = res.access_token
  tokenCache.expireAt = Date.now() + (res.expires_in - 60) * 1000
  return tokenCache.token
}

// ---------- 签名 ----------
// 支付签名 pay_sig：uri + '&' + post_body，密钥 AppKey
function calcPaySig(uri, postBody, appKey) {
  return crypto.createHmac('sha256', appKey)
    .update(uri + '&' + postBody)
    .digest('hex')
}

// ---------- 查单取 left_fee ----------
async function queryLeftFee(openid, outTradeNo) {
  const env = config.sandbox ? 1 : 0
  const appKey = config.sandbox ? config.sandboxAppKey : config.prodAppKey
  const bodyObj = { openid, env, order_id: outTradeNo }
  const bodyStr = JSON.stringify(bodyObj)
  const paySig = calcPaySig('/xpay/query_order', bodyStr, appKey)
  const accessToken = await getAccessToken()

  const url = `https://api.weixin.qq.com/xpay/query_order?access_token=${accessToken}&pay_sig=${paySig}`
  const res = await httpPost(url, bodyStr)

  if (res.errcode !== 0) {
    throw new Error(`query_order 失败: ${res.errmsg || res.errcode}`)
  }
  const order = res.order || {}
  return {
    leftFee: order.left_fee,
    wxOrderId: order.wx_order_id,
    paidFee: order.paid_fee,
    status: order.status
  }
}

// ---------- 发起退款 ----------
async function startRefund(openid, outTradeNo, wxOrderId, refundFee) {
  const env = config.sandbox ? 1 : 0
  const appKey = config.sandbox ? config.sandboxAppKey : config.prodAppKey

  // 本地生成退款单号（8-32 位，字母/数字/_/-）
  const refundOrderId = 'R' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  const bodyObj = {
    openid,
    env,
    wx_order_id: wxOrderId,        // 优先用平台单号（与 order_id 二选一）
    refund_order_id: refundOrderId,
    left_fee: refundFee,           // 剩余可退金额
    refund_fee: refundFee,         // 本次退款金额（全额退）
    biz_meta: JSON.stringify({ outTradeNo, refundAt: Date.now() }),
    refund_reason: 3,              // 意愿问题：用户主动退款
    req_from: 2                    // 用户自己发起
  }
  const bodyStr = JSON.stringify(bodyObj)
  const paySig = calcPaySig('/xpay/refund_order', bodyStr, appKey)
  const accessToken = await getAccessToken()

  const url = `https://api.weixin.qq.com/xpay/refund_order?access_token=${accessToken}&pay_sig=${paySig}`
  const res = await httpPost(url, bodyStr)

  if (res.errcode !== 0) {
    throw new Error(`refund_order 失败: ${res.errmsg || res.errcode}`)
  }
  return {
    refundOrderId: res.refund_order_id || refundOrderId,
    refundWxOrderId: res.refund_wx_order_id || ''
  }
}

exports.main = async (event) => {
  const { outTradeNo } = event
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { ok: false, error: '无法获取用户身份' }
  if (!outTradeNo) return { ok: false, error: '缺少 outTradeNo' }

  try {
    // 1. 校验本地订单
    const orderRes = await db.collection('virtualpay_orders').where({ outTradeNo }).limit(1).get()
    if (orderRes.data.length === 0) return { ok: false, error: '订单不存在' }
    const order = orderRes.data[0]
    if (order.status !== 'delivered') {
      return { ok: false, error: `仅已发货订单可退款（当前：${order.status}）` }
    }
    if (!order.wxOrderId) {
      return { ok: false, error: '订单缺少平台单号 wxOrderId，请确认发货是否成功' }
    }

    // 2. 查单获取 leftFee
    const info = await queryLeftFee(OPENID, outTradeNo)
    if (!info.leftFee || info.leftFee <= 0) {
      return { ok: false, error: '该订单无可退金额（可能已全额退款）' }
    }

    // 3. 发起退款（全额退）
    const refundInfo = await startRefund(OPENID, outTradeNo, order.wxOrderId, info.leftFee)

    // 4. 在本地订单记录上打个标记：refundOrderId（具体完成仍由 payNotify 中的 xpay_refund_notify 推送驱动）
    await db.collection('virtualpay_orders').doc(order._id).update({
      data: {
        refundOrderId: refundInfo.refundOrderId,
        refundWxOrderId: refundInfo.refundWxOrderId,
        refundStartTime: Date.now(),
        // 临时状态：refund_pending；xpay_refund_notify 推送到位后改为 refunded
        status: 'refund_pending',
        updateTime: Date.now()
      }
    })

    return {
      ok: true,
      data: {
        refundOrderId: refundInfo.refundOrderId,
        leftFee: info.leftFee,
        message: '退款任务已发起，等待平台异步处理'
      }
    }
  } catch (err) {
    console.error('refundOrder error:', err)
    return { ok: false, error: err.message || '退款失败' }
  }
}
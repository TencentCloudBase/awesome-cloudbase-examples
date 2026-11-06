// queryOrder：查单兜底 + 我的订单/道具列表
// 用途：
//  1. { outTradeNo }          调微信 xpay/query_order 查单，已支付则补发货（兜底）
//  2. { list: true }          返回当前用户订单列表（前端「我的」页）
//  3. { goods: true }         返回当前用户已购道具列表（前端「我的」页）
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
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('响应解析失败: ' + data))
        }
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
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            resolve({ errcode: -1, errmsg: '响应解析失败: ' + data })
          }
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// ---------- access_token（简单内存缓存） ----------
let tokenCache = { token: '', expireAt: 0 }
async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expireAt) {
    return tokenCache.token
  }
  const url =
    `https://api.weixin.qq.com/cgi-bin/token` +
    `?grant_type=client_credential&appid=${config.appid}&secret=${config.appSecret}`
  const res = await httpGet(url)
  if (!res.access_token) {
    throw new Error('获取 access_token 失败: ' + (res.errmsg || '未知错误'))
  }
  tokenCache.token = res.access_token
  tokenCache.expireAt = Date.now() + (res.expires_in - 60) * 1000 // 提前 60s 过期
  return tokenCache.token
}

// ---------- 支付签名 pay_sig（B 端接口） ----------
// uri 为实际接口路径，如 /xpay/query_order；post_body 与真实请求体完全一致
function calcPaySig(uri, postBody, appKey) {
  const msg = uri + '&' + postBody
  return crypto.createHmac('sha256', appKey).update(msg).digest('hex')
}

// ---------- 查单并补发货 ----------
async function queryAndDeliver(openid, outTradeNo) {
  // 请求体：注意参数名是 order_id（传业务单号），不是 out_trade_no
  //    env：沙箱=1，现网=0
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
  // order.status: 0初始化 1创建成功 2已支付待发货 3发货中 4已发货 5已退款 6已关闭
  const localOrderRes = await db.collection('virtualpay_orders').where({ outTradeNo }).limit(1).get()
  const localOrder = localOrderRes.data[0]

  // 已支付且本地未发货 → 补发货
  if ((order.status === 2 || order.status === 3) && localOrder && localOrder.status !== 'delivered') {
    await db.collection('virtualpay_orders').doc(localOrder._id).update({
      data: {
        status: 'delivered',
        wxOrderId: order.wx_order_id,
        deliverTime: Date.now(),
        updateTime: Date.now()
      }
    })

    const productId = localOrder.productId
    const quantity = localOrder.buyQuantity || 1
    const userGoodsRes = await db.collection('virtualpay_user_goods').where({ openid, productId }).limit(1).get()
    if (userGoodsRes.data.length > 0) {
      const ug = userGoodsRes.data[0]
      await db.collection('virtualpay_user_goods').doc(ug._id).update({
        data: { quantity: db.command.inc(quantity), updateTime: Date.now() }
      })
    } else {
      await db.collection('virtualpay_user_goods').add({
        data: {
          openid,
          productId,
          productName: localOrder.productName || productId,
          quantity,
          createTime: Date.now(),
          updateTime: Date.now()
        }
      })
    }
  }

  return {
    status: order.status,
    statusText: statusText(order.status),
    wxOrderId: order.wx_order_id,
    paidFee: order.paid_fee,
    paidTime: order.paid_time
  }
}

function statusText(s) {
  const map = {
    0: '初始化',
    1: '创建成功',
    2: '已支付待发货',
    3: '发货中',
    4: '已发货',
    5: '已退款',
    6: '已关闭'
  }
  return map[s] || String(s)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { ok: false, error: '无法获取用户身份' }
  }

  try {
    // 我的订单列表（按状态过滤：默认只展示有效订单）
    if (event.list) {
      const statusFilter = Array.isArray(event.statuses) && event.statuses.length
        ? event.statuses
        : ['pending', 'paid', 'delivered', 'refund_pending', 'refunded']
      const _ = db.command
      const res = await db
        .collection('virtualpay_orders')
        .where({ openid: OPENID, status: _.in(statusFilter) })
        .orderBy('createTime', 'desc')
        .limit(50)
        .get()
      return { ok: true, orders: res.data }
    }

    // 我的道具列表
    if (event.goods) {
      const res = await db.collection('virtualpay_user_goods').where({ openid: OPENID }).limit(50).get()
      return { ok: true, goods: res.data }
    }

    // 单号查单（兜底）
    if (event.outTradeNo) {
      const info = await queryAndDeliver(OPENID, event.outTradeNo)
      return { ok: true, data: info }
    }

    return { ok: false, error: '缺少查询参数' }
  } catch (err) {
    console.error('queryOrder error:', err)
    return { ok: false, error: err.message || '查询失败' }
  }
}

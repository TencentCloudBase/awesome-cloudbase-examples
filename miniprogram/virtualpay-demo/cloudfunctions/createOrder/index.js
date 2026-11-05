// createOrder：虚拟支付下单云函数
// 流程：code 换 session → 生成 outTradeNo → 构造 signData → 双签名（paySig/signature）→ 订单入库
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const config = require('./config')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ---------- 集合初始化：不存在则创建（避免 DATABASE_COLLECTION_NOT_EXIST） ----------
const COLLECTIONS = ['virtualpay_orders', 'virtualpay_user_goods']
async function ensureCollections() {
  for (const name of COLLECTIONS) {
    try {
      // 尝试 add 一条占位：成功说明集合存在
      await db.collection(name).add({ data: { _init: true, ts: Date.now() } })
      console.log(`集合 ${name} 已存在`)
    } catch (err) {
      // 低代码环境下 errCode 字段可能为空，必须依赖错误消息匹配
      const errMsg = ((err && (err.message || err.errMsg)) || '').toString()
      const isNotExist =
        err.errCode === -502005 ||
        /not exists/i.test(errMsg) ||
        /Db or Table not exist/i.test(errMsg)
      console.log(`探测 ${name}: errCode=${err.errCode}, msg=${errMsg}, isNotExist=${isNotExist}`)
      if (isNotExist) {
        try {
          await db.createCollection(name)
          console.log(`集合 ${name} 创建成功`)
        } catch (createErr) {
          const cMsg = ((createErr && (createErr.message || createErr.errMsg)) || '').toString()
          console.log(`创建 ${name} 失败: errCode=${createErr.errCode}, msg=${cMsg}`)
        }
      }
    }
  }
}

// ---------- 签名工具 ----------
// 支付签名 paySig：uri 固定为 requestVirtualPayment（C 端下单）
function calcPaySig(uri, postBody, appKey) {
  const msg = uri + '&' + postBody
  return crypto.createHmac('sha256', appKey).update(msg).digest('hex')
}

// 用户态签名 signature：密钥为 sessionKey
function calcSignature(postBody, sessionKey) {
  return crypto.createHmac('sha256', sessionKey).update(postBody).digest('hex')
}

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

// code 换 session_key + openid（需要 AppSecret）
async function code2Session(code) {
  const url =
    `https://api.weixin.qq.com/sns/jscode2session` +
    `?appid=${config.appid}&secret=${config.appSecret}&js_code=${code}&grant_type=authorization_code`
  return httpGet(url)
}

exports.main = async (event) => {
  const { code, productId, buyQuantity = 1 } = event
  if (!code || !productId) {
    return { ok: false, error: '缺少 code 或 productId' }
  }

  // 0. 确保集合存在（避免 DATABASE_COLLECTION_NOT_EXIST）
  await ensureCollections()

  // 1. code 换登录态
  const sess = await code2Session(code)
  if (!sess.openid || !sess.session_key) {
    return { ok: false, error: `code2Session 失败: ${sess.errmsg || '未知错误'}` }
  }
  const openid = sess.openid
  const sessionKey = sess.session_key

  // 2. 校验商品
  const product = config.goods.find((g) => g.productId === productId)
  if (!product) {
    return { ok: false, error: '商品不存在' }
  }
  const goodsPrice = product.price // 单位：分，全程不分换算

  // 2.1 数量与金额校验：buyQuantity 来自前端 event，属于不可信输入，必须限制上下限，
  //     防止超大数量写入订单表并进入 signData 发起异常支付请求
  const MAX_QTY = 99
  const MAX_TOTAL_AMOUNT = 100000 // 单笔订单金额上限（分）
  const q = parseInt(buyQuantity, 10)
  if (!Number.isInteger(q) || q < 1 || q > MAX_QTY) {
    return { ok: false, error: '购买数量不合法' }
  }
  const quantity = q
  const totalAmount = goodsPrice * quantity
  if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0 || totalAmount > MAX_TOTAL_AMOUNT) {
    return { ok: false, error: '订单金额超出限制' }
  }

  // 3. 生成唯一业务单号（8-32 位，不以 _ 开头，不能复用）
  const outTradeNo = 'T' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

  // 4. 构造 signData（JSON 字符串，键顺序固定；attach 必填，发货时原样透传）
  //    env：沙箱=1，现网=0
  const attach = JSON.stringify({ productId, name: product.name })
  const env = config.sandbox ? 1 : 0
  const appKey = config.sandbox ? config.sandboxAppKey : config.prodAppKey
  const signData = JSON.stringify({
    offerId: config.offerId,
    buyQuantity: quantity,
    env,
    currencyType: 'CNY',
    productId,
    goodsPrice,
    outTradeNo,
    attach
  })

  // 5. 双签名
  const paySig = calcPaySig('requestVirtualPayment', signData, appKey)
  const signature = calcSignature(signData, sessionKey)

  // 6. 订单入库（状态：待支付）
  const order = {
    openid,
    outTradeNo,
    productId,
    productName: product.name,
    goodsPrice,
    buyQuantity: quantity,
    attach,
    status: 'pending', // pending / paid / delivered / refunded / closed
    createTime: Date.now(),
    updateTime: Date.now()
  }
  await db.collection('virtualpay_orders').add({ data: order })

  // 7. 返回前端拉起支付所需 payData
  return {
    ok: true,
    data: {
      mode: 'short_series_goods',
      signData,
      paySig,
      signature,
      outTradeNo
    }
  }
}

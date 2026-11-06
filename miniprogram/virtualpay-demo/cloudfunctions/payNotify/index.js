// payNotify：虚拟支付回调云函数（消息推送模式，msg_type=event）
// 通过微信开发者工具「消息推送」订阅虚拟支付 7 个事件后，平台将回调推送到本函数。
// 事件参考：
//   xpay_goods_deliver_notify   道具发货通知（支付成功后推送，用于发货）
//   xpay_coin_pay_notify        代币支付通知
//   xpay_refund_notify          退款通知
//   xpay_complaint_notify       用户投诉通知
//   xpay_subscribe_signing_result_notify   订阅签约结果
//   xpay_subscribe_pay_fail_notify         订阅支付失败
//   xpay_subscribe_ios_refund_query_notify iOS 订阅退款问询
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ---------- 幂等发货 ----------
// 以平台单号 wx_order_id（WeChatPayInfo.MchOrderNo）做幂等去重
async function deliverGoods(event) {
  const openid = event.OpenId
  const outTradeNo = event.OutTradeNo
  const wxOrderId = event.WeChatPayInfo && event.WeChatPayInfo.MchOrderNo
  const productId = event.GoodsInfo && event.GoodsInfo.ProductId
  const quantity = (event.GoodsInfo && event.GoodsInfo.Quantity) || 1

  // 1. 查本地订单（用 outTradeNo）
  const orderRes = await db.collection('virtualpay_orders').where({ outTradeNo }).limit(1).get()
  if (orderRes.data.length === 0) {
    console.log('未找到订单，忽略：', outTradeNo)
    return
  }
  const order = orderRes.data[0]

  // 2. 幂等：该订单已发货则直接返回成功
  if (order.status === 'delivered') {
    console.log('订单已发货，幂等跳过：', outTradeNo)
    return
  }

  // 3. 发货：更新订单状态 + 发放道具到 virtualpay_user_goods
  await db
    .collection('virtualpay_orders')
    .doc(order._id)
    .update({
      data: {
        status: 'delivered',
        wxOrderId,
        deliverTime: Date.now(),
        updateTime: Date.now()
      }
    })

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
        productName: order.productName || productId,
        quantity,
        createTime: Date.now(),
        updateTime: Date.now()
      }
    })
  }
  console.log('发货成功：', outTradeNo, 'wxOrderId=', wxOrderId)
}

// ---------- 退款处理 ----------
async function refundOrder(event) {
  const outTradeNo = event.OutTradeNo
  const orderRes = await db.collection('virtualpay_orders').where({ outTradeNo }).limit(1).get()
  if (orderRes.data.length === 0) return
  const order = orderRes.data[0]
  if (order.status === 'refunded' || order.status === 'closed') return // 幂等

  await db.collection('virtualpay_orders').doc(order._id).update({
    data: { status: 'refunded', refundTime: Date.now(), updateTime: Date.now() }
  })

  // 回收道具（按退款事件中的数量，简单处理为清零）
  const openid = event.OpenId
  const productId = event.GoodsInfo && event.GoodsInfo.ProductId
  if (openid && productId) {
    const userGoodsRes = await db.collection('virtualpay_user_goods').where({ openid, productId }).limit(1).get()
    if (userGoodsRes.data.length > 0) {
      const ug = userGoodsRes.data[0]
      const backQty = (event.GoodsInfo && event.GoodsInfo.Quantity) || ug.quantity
      await db.collection('virtualpay_user_goods').doc(ug._id).update({
        data: { quantity: Math.max(0, ug.quantity - backQty), updateTime: Date.now() }
      })
    }
  }
  console.log('退款处理完成：', outTradeNo)
}

exports.main = async (event) => {
  console.log('虚拟支付回调收到：', JSON.stringify(event))
  const Event = event.Event

  try {
    switch (Event) {
      case 'xpay_goods_deliver_notify':
        await deliverGoods(event)
        break
      case 'xpay_refund_notify':
        await refundOrder(event)
        break
      case 'xpay_coin_pay_notify':
      case 'xpay_complaint_notify':
      case 'xpay_subscribe_signing_result_notify':
      case 'xpay_subscribe_pay_fail_notify':
        // 本 demo 未使用代币/订阅/投诉，先记录
        console.log('暂不处理的事件：', Event)
        break
      case 'xpay_subscribe_ios_refund_query_notify':
        // iOS 订阅退款问询：需在 3 秒内响应特殊格式（demo 默认拒绝退款）
        return {
          ErrCode: 0,
          ErrMsg: 'success',
          IosRefundQueryResponse: {
            result_code: 1,
            result_info: '数字内容购买后不支持退款',
            evidence: '该订阅内容为虚拟数字服务，开通即生效，不支持退款'
          }
        }
      default:
        console.log('未知事件：', Event)
    }

    // 标准成功响应（返回非 0 微信会持续重试，最多 15 次）
    return { ErrCode: 0, ErrMsg: 'success' }
  } catch (err) {
    console.error('回调处理失败：', err)
    return { ErrCode: -1, ErrMsg: err.message || '处理失败' }
  }
}

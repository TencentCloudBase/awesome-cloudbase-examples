/**
 * 微信支付 - 下单
 */
const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();

  try {
    // 从请求参数中获取订单信息
    const {
      orderItems, // 订单商品列表
      totalAmount, // 订单总金额(单位:分)
      description, // 商品描述
      cartItemIds, // 购物车项ID列表
      address, // 收货地址
      remark // 订单备注
    } = event;

    // 生成商户订单号
    const outTradeNo = `${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;

    // 1. 创建订单记录
    const orderData = {
      outTradeNo, // 商户订单号
      totalAmount, // 订单总金额(分)
      description, // 商品描述
      status: 'NOTPAY', // 订单状态：未支付
      items: orderItems, // 订单商品列表
      address, // 收货地址
      remark, // 订单备注
      _openid: wxContext.OPENID, // 用户openid
      createTime: new Date(), // 创建时间
      updateTime: new Date() // 更新时间
    };

    // 开始事务
    const result = await db.runTransaction(async transaction => {
      // 创建订单记录
      const orderRes = await transaction.collection('orders').add({
        data: orderData
      });

      // 从购物车中删除已结算的商品
      if (cartItemIds && cartItemIds.length > 0) {
        for (const cartId of cartItemIds) {
          // 确认该购物车项属于当前用户
          const cartItem = await transaction.collection('cart').doc(cartId).get();
          if (cartItem.data && cartItem.data._openid === wxContext.OPENID) {
            await transaction.collection('cart').doc(cartId).remove();
          }
        }
      }

      // 调用微信支付下单接口
      // const payRes = await cloud.callFunction({
      //   name: 'cloudbase_module',
      //   data: {
      //     name: 'wxpay_order',
      //     data: {
      //       description: description || '商品购买',
      //       amount: {
      //         total: totalAmount,
      //         currency: 'CNY',
      //       },
      //       out_trade_no: outTradeNo,
      //       payer: {
      //         openid: wxContext.OPENID,
      //       },
      //     },
      //   },
      // });

      // 返回订单信息和支付参数
      return {
        success: true,
        orderId: orderRes._id,
        outTradeNo,
        paymentParams: {}, // 返回给小程序的支付参数
      };
    });

    return result;

  } catch (error) {
    console.error('创建订单失败', error);
    return {
      success: false,
      message: error.message || '创建订单失败'
    };
  }
};
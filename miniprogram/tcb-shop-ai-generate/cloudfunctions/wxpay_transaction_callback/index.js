/**
 * 微信支付 - 支付结果通知处理
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  
  try {
    // 解析微信支付回调信息
    const { resource } = event;
    
    // 从解密后的通知数据中获取支付结果信息
    const {
      out_trade_no,          // 商户订单号
      transaction_id,        // 微信支付订单号
      trade_state,           // 交易状态
      trade_state_desc,      // 交易状态描述
      success_time,          // 支付完成时间
      amount: { 
        total,               // 订单总金额
        payer_total,         // 用户支付金额
        currency            // 货币类型
      },
      payer: { openid }      // 支付者信息
    } = resource.original_type === 'transaction' ? resource.json : {};
    
    // 查询订单
    const orderRes = await db.collection('orders')
      .where({
        outTradeNo: out_trade_no
      })
      .get();
    
    if (!orderRes.data || orderRes.data.length === 0) {
      throw new Error(`订单不存在: ${out_trade_no}`);
    }
    
    const order = orderRes.data[0];
    
    // 开始事务
    const result = await db.runTransaction(async transaction => {
      // 更新订单状态
      const updateData = {
        status: trade_state,
        statusDesc: trade_state_desc,
        transactionId: transaction_id,
        updateTime: new Date()
      };
      
      // 如果支付成功，记录支付时间
      if (trade_state === 'SUCCESS') {
        updateData.payTime = success_time ? new Date(success_time) : new Date();
        
        // 这里可以添加支付成功后的其他业务逻辑
        // 例如：
        // 1. 更新商品销量
        // 2. 创建物流订单
        // 3. 发送支付成功通知
        // 4. 处理优惠券核销
        // 5. 添加用户积分
      }
      
      // 更新订单
      await transaction.collection('orders').doc(order._id).update({
        data: updateData
      });
      
      // 创建支付记录
      await transaction.collection('payments').add({
        data: {
          orderId: order._id,
          outTradeNo: out_trade_no,
          transactionId: transaction_id,
          amount: total,
          payerAmount: payer_total,
          currency: currency,
          status: trade_state,
          statusDesc: trade_state_desc,
          payTime: success_time ? new Date(success_time) : new Date(),
          _openid: openid,
          createTime: new Date()
        }
      });
      
      return {
        success: true,
        message: '支付回调处理成功'
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('支付回调处理失败', error);
    return {
      success: false,
      message: error.message || '支付回调处理失败'
    };
  }
};
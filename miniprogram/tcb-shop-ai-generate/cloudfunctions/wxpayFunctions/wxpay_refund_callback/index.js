/**
 * 微信支付 - 退款结果通知处理
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  
  try {
    // 解析微信支付回调信息
    const { resource } = event;
    
    // 从解密后的通知数据中获取退款结果信息
    const {
      out_trade_no,          // 商户订单号
      out_refund_no,         // 商户退款单号
      refund_id,             // 微信退款单号
      refund_status,         // 退款状态
      success_time,          // 退款成功时间
      amount: { 
        refund,              // 退款金额
        total,               // 原订单金额
        payer_refund        // 用户退款金额
      }
    } = resource.original_type === 'refund' ? resource.json : {};

    // 开始事务
    const result = await db.runTransaction(async transaction => {
      // 查询退款记录
      const refundRes = await transaction.collection('refunds')
        .where({
          outRefundNo: out_refund_no
        })
        .get();

      if (!refundRes.data || refundRes.data.length === 0) {
        throw new Error(`退款记录不存在: ${out_refund_no}`);
      }

      const refundRecord = refundRes.data[0];

      // 更新退款记录状态
      await transaction.collection('refunds').doc(refundRecord._id).update({
        data: {
          status: refund_status,           // 退款状态
          refundId: refund_id,             // 微信退款单号
          successTime: success_time ? new Date(success_time) : null,
          updateTime: new Date()
        }
      });

      // 查询订单
      const orderRes = await transaction.collection('orders')
        .where({
          outTradeNo: out_trade_no
        })
        .get();

      if (!orderRes.data || orderRes.data.length === 0) {
        throw new Error(`订单不存在: ${out_trade_no}`);
      }

      const order = orderRes.data[0];

      // 更新订单状态
      const orderUpdateData = {
        updateTime: new Date()
      };

      // 根据退款状态更新订单
      switch (refund_status) {
        case 'SUCCESS':
          // 退款成功
          orderUpdateData.status = 'REFUND';
          orderUpdateData.statusDesc = '退款成功';
          orderUpdateData['refundInfo.status'] = 'SUCCESS';
          orderUpdateData['refundInfo.successTime'] = new Date(success_time);
          break;
        
        case 'CLOSED':
          // 退款关闭
          orderUpdateData.status = 'SUCCESS'; // 恢复为支付成功状态
          orderUpdateData.statusDesc = '支付成功';
          orderUpdateData['refundInfo.status'] = 'CLOSED';
          break;
        
        case 'ABNORMAL':
          // 退款异常
          orderUpdateData['refundInfo.status'] = 'ABNORMAL';
          break;
        
        default:
          // 其他状态保持原状
          break;
      }

      await transaction.collection('orders').doc(order._id).update({
        data: orderUpdateData
      });

      // 如果退款成功，可以在这里添加其他业务逻辑
      // 例如：
      // 1. 恢复商品库存
      // 2. 发送退款成功通知
      // 3. 更新商家的交易统计数据

      return {
        success: true,
        message: '退款回调处理成功'
      };
    });

    return result;

  } catch (error) {
    console.error('退款回调处理失败', error);
    return {
      success: false,
      message: error.message || '退款回调处理失败'
    };
  }
};
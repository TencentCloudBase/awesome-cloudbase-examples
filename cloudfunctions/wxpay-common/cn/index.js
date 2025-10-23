const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 微信支付 通用接口示例
 * @param {Object} event - 云函数调用事件对象。小程序端调用时，event 是小程序端调用云函数时的入参，HTTP 请求的形式调用时，event 是 `集成请求体`
 * @param {Object} context - 云函数上下文
 * @returns {Promise<Object>} 响应结果
 */
exports.main = async (event, context) => {
  // 根据 type 处理不同事件
  switch (event.type) {
    case 'wxpay_order':
      return await wxpayOrder(event, context);
    case 'wxpay_query_order_by_out_trade_no':
      return await queryOrderByOutTradeNo(event, context);
    case 'wxpay_query_order_by_transaction_id':
      return await queryOrderByTransactionId(event, context);
    case 'wxpay_refund':
      return await refund(event, context);
    case 'wxpay_refund_query':
      return await refundQuery(event, context);
    default:
      return {
        code: -1,
        msg: 'Unimplemented method',
      };
  }
};

/**
 * 统一下单
 */
async function wxpayOrder(event, context) {
  const wxContext = cloud.getWXContext();

  // 商户自行生成商户订单号，此处仅为代码示例
  const outTradeNo = Math.round(Math.random() * 10 ** 13) + Date.now();

  // 商户存储订单号到数据库，便于后续与微信侧订单号关联。例如使用云开发云存储能力：
  // db.collection('orders').add({ data: { outTradeNo } });

  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_order',
      // 示例数据 请根据实际业务情况修改
      data: {
        description: '<商品描述>',
        amount: {
          total: 1, // 订单金额
          currency: 'CNY',
        },
        // 商户生成的订单号
        out_trade_no: outTradeNo,
        payer: {
          // 服务端云函数中直接获取当前用户openId
          openid: wxContext.OPENID,
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 商户订单号查询订单
 */
async function queryOrderByOutTradeNo(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_query_order_by_out_trade_no',
      // 示例数据 请根据实际业务情况修改
      data: {
        // 请输入实际商户订单号
        out_trade_no: '2024040118006666',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 微信支付订单号查询订单
 */
async function queryOrderByTransactionId(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_query_order_by_transaction_id',
      // 示例数据 请根据实际业务情况修改
      data: {
        // 请输入实际微信支付订单号
        transaction_id: '1217752501201407033233368018',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 申请退款
 */
async function refund(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_refund',
      // 示例数据 请根据实际业务情况修改
      data: {
        transaction_id: '1217752501201407033233368018', // 微信订单号
        out_refund_no: '2024040118006666', // 商户内部退款单号
        amount: {
          refund: 1, // 退款金额
          total: 1, // 原订单金额,
          currency: 'CNY',
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 通过商户退款单号查询单笔退款
 */
async function refundQuery(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_refund_query',
      // 示例数据 请根据实际业务情况修改
      data: {
        params: {
          out_refund_no: '2024040118006666', // 填入商户退款单号
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 微信支付 通用接口示例
 *
 * WeChat Pay generic interface example.
 *
 * @param {Object} event - 云函数调用事件对象。小程序端调用时，event 是小程序端调用云函数时的入参，HTTP 请求的形式调用时，event 是 `集成请求体`
 *                         / Cloud function event. From a Mini Program call it is the input parameters;
 *                           from an HTTP request it is the "integrated request body".
 * @param {Object} context - 云函数上下文 / Cloud function context
 * @returns {Promise<Object>} 响应结果 / Response payload
 */
exports.main = async (event, context) => {
  // 根据 type 处理不同事件
  // Dispatch on the event `type` field
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
 * Unified order placement.
 */
async function wxpayOrder(event, context) {
  const wxContext = cloud.getWXContext();

  // 商户自行生成商户订单号，此处仅为代码示例
  // The merchant generates their own trade number; this snippet is only a demonstration.
  const outTradeNo = Math.round(Math.random() * 10 ** 13) + Date.now();

  // 商户存储订单号到数据库，便于后续与微信侧订单号关联。例如使用云开发云存储能力：
  // The merchant should persist the trade number to the database so it can later be linked
  // to the WeChat-side transaction ID. For example, using CloudBase database:
  // db.collection('orders').add({ data: { outTradeNo } });

  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称 / Workflow name
      name: 'wxpay_order',
      // 示例数据 请根据实际业务情况修改
      // Sample data — adjust according to your actual business logic.
      data: {
        description: '<商品描述>', // <Product description>
        amount: {
          total: 1, // 订单金额 / Order amount
          currency: 'CNY',
        },
        // 商户生成的订单号 / Merchant-generated trade number
        out_trade_no: outTradeNo,
        payer: {
          // 服务端云函数中直接获取当前用户openId
          // Read the current user's openid from the server-side context directly.
          openid: wxContext.OPENID,
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 商户订单号查询订单
 * Query an order by the merchant trade number.
 */
async function queryOrderByOutTradeNo(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称 / Workflow name
      name: 'wxpay_query_order_by_out_trade_no',
      // 示例数据 请根据实际业务情况修改
      // Sample data — adjust according to your actual business logic.
      data: {
        // 请输入实际商户订单号
        // Replace with the actual merchant trade number.
        out_trade_no: '2024040118006666',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 微信支付订单号查询订单
 * Query an order by the WeChat Pay transaction ID.
 */
async function queryOrderByTransactionId(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称 / Workflow name
      name: 'wxpay_query_order_by_transaction_id',
      // 示例数据 请根据实际业务情况修改
      // Sample data — adjust according to your actual business logic.
      data: {
        // 请输入实际微信支付订单号
        // Replace with the actual WeChat Pay transaction ID.
        transaction_id: '1217752501201407033233368018',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 申请退款
 * Apply for a refund.
 */
async function refund(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称 / Workflow name
      name: 'wxpay_refund',
      // 示例数据 请根据实际业务情况修改
      // Sample data — adjust according to your actual business logic.
      data: {
        transaction_id: '1217752501201407033233368018', // 微信订单号 / WeChat transaction ID
        out_refund_no: '2024040118006666',              // 商户内部退款单号 / Merchant refund number
        amount: {
          refund: 1,    // 退款金额 / Refund amount
          total: 1,     // 原订单金额 / Original order amount
          currency: 'CNY',
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * 通过商户退款单号查询单笔退款
 * Query a single refund record by the merchant refund number.
 */
async function refundQuery(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称 / Workflow name
      name: 'wxpay_refund_query',
      // 示例数据 请根据实际业务情况修改
      // Sample data — adjust according to your actual business logic.
      data: {
        params: {
          out_refund_no: '2024040118006666', // 填入商户退款单号 / Merchant refund number
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

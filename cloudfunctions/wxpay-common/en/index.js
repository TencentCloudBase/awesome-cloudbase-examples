const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * WeChat Pay common interface example
 * @param {Object} event - Cloudbase function call event object. When called from mini program, event is the parameter passed when calling the Cloudbase function from the mini program; when called via HTTP request, event is the `integrated request body`
 * @param {Object} context - Cloudbase function context
 * @returns {Promise<Object>} Response result
 */
exports.main = async (event, context) => {
  // Handle different events based on type
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
 * Unified order
 */
async function wxpayOrder(event, context) {
  const wxContext = cloud.getWXContext();

  // Merchant generates merchant order number, this is just a code example
  const outTradeNo = Math.round(Math.random() * 10 ** 13) + Date.now();

  // Merchant stores order number to database for later association with WeChat order number. For example using Cloudbase storage capability:
  // db.collection('orders').add({ data: { outTradeNo } });

  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // Workflow name
      name: 'wxpay_order',
      // Example data, please modify according to actual business situation
      data: {
        description: '<Product description>',
        amount: {
          total: 1, // Order amount
          currency: 'CNY',
        },
        // Merchant generated order number
        out_trade_no: outTradeNo,
        payer: {
          // Directly get current user openId in server-side Cloudbase function
          openid: wxContext.OPENID,
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * Query order by merchant order number
 */
async function queryOrderByOutTradeNo(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // Workflow name
      name: 'wxpay_query_order_by_out_trade_no',
      // Example data, please modify according to actual business situation
      data: {
        // Please enter actual merchant order number
        out_trade_no: '2024040118006666',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * Query order by WeChat Pay order number
 */
async function queryOrderByTransactionId(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // Workflow name
      name: 'wxpay_query_order_by_transaction_id',
      // Example data, please modify according to actual business situation
      data: {
        // Please enter actual WeChat Pay order number
        transaction_id: '1217752501201407033233368018',
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * Apply for refund
 */
async function refund(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // Workflow name
      name: 'wxpay_refund',
      // Example data, please modify according to actual business situation
      data: {
        transaction_id: '1217752501201407033233368018', // WeChat order number
        out_refund_no: '2024040118006666', // Merchant internal refund number
        amount: {
          refund: 1, // Refund amount
          total: 1, // Original order amount,
          currency: 'CNY',
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

/**
 * Query single refund by merchant refund number
 */
async function refundQuery(event, context) {
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // Workflow name
      name: 'wxpay_refund_query',
      // Example data, please modify according to actual business situation
      data: {
        params: {
          out_refund_no: '2024040118006666', // Fill in merchant refund number
        },
      },
    },
  });
  return { code: 0, data: res.result };
}

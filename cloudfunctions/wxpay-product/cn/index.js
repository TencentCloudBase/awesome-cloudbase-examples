const cloud = require('wx-server-sdk');
const cloudBase = require('@cloudbase/node-sdk');

// 初始化 sdk
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const app = cloudBase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});
const db = app.database();

/**
 * 微信支付 商品下单接口示例
 * 预设当前拥有 order, product 实体
 * @param {*} event - 云函数调用事件对象。小程序端调用时，event 是小程序端调用云函数时的入参，HTTP 请求的形式调用时，event 是 `集成请求体`
 * @param {*} context - 云函数上下文
 * @returns {Promise<*>} 响应结果
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
 * @param {object} params - 商品描述
 * @param {string} params.productId - 商品ID
 * @param {number} params.count - 商品数量
 * @param {*} context - 云函数上下文
 * @returns {Promise<*>} 响应结果
 */
async function wxpayOrder(params, context) {
  const wxContext = cloud.getWXContext();
  // 1. 校验入参
  // 仅为示例，实际业务可能需要更精确的校验
  if (!params.productId || !params.count) {
    return { code: -1, msg: 'Invalid params' };
  }

  // 2. 根据商品 ID 查询商品信息，商品信息不应从前端传入
  const productRes = await db.collection('production').doc(params.productId).get();

  if (!productRes.data?.length) {
    return { code: -1, msg: 'Product not found' };
  }
  const product = productRes.data[0];

  // 3. 构造订单数据
  // 商户订单号，商户自行生成商户订单号，此处仅为代码示例
  const outTradeNo = Math.round(Math.random() * 10 ** 13) + Date.now();
  // 订单金额
  const amountTotal = params.count * product.price;
  // 货币类型
  const amountCurrency = 'CNY';

  const orderData = {
    // 商品描述
    description: product.description,
    out_trade_no: outTradeNo,
    // 订单金额信息
    amount: {
      // 订单总金额，单位为分
      total: amountTotal,
      // CNY：人民币，境内商户号仅支持人民币
      currency: amountCurrency,
    },
    // 支付人
    payer: {
      // 服务端云函数中直接获取当前用户openId，不要从前端传入
      openid: wxContext.OPENID,
    },
    // 异步接收微信支付结果通知的回调地址
    notify_url: 'https://example.com/wxpay/notify',
  };

  // 4. 存储订单信息到数据库
  const orderRes = await db.collection('order').add({
    data: {
      outTradeNo,
      productId: product.id,
      openid: wxContext.OPENID,
      amountTotal,
      amountCurrency,
      // ...更多字段
    },
  });

  if (!orderRes.id) {
    return { code: -1, msg: 'Order save failed' };
  }

  // 5. 调用微信支付接口生成支付订单
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_order',
      data: orderData,
    },
  });

  // [6]. 可校验下单结果是否符合预期

  return { code: 0, data: res.result };
}

/**
 * 商户订单号查询订单
 * @param {object} params
 * @param {string} params.outTradeNo 商户订单号
 * @param {*} context
 * @returns
 */
async function queryOrderByOutTradeNo(params, context) {
  // 1. 校验入参
  if (!params.outTradeNo) {
    return { code: -1, msg: 'Invalid params' };
  }

  // 2. 查询订单
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_query_order_by_out_trade_no',
      // 示例数据 请根据实际业务情况修改
      data: {
        // 请输入实际商户订单号
        out_trade_no: params.outTradeNo,
      },
    },
  });

  // [3]. 可校验查询结果是否符合预期

  return { code: 0, data: res.result };
}

/**
 * 微信支付订单号查询订单
 * @param {object} params
 * @param {string} params.transactionId 微信支付订单号
 * @param {*} context
 * @returns
 */
async function queryOrderByTransactionId(params, context) {
  // 1. 校验入参
  // transaction_id 可通过 `支付通知 API` 获取，并存入 `order` 表中，详细参见：https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_5.shtml
  // transaction_id 可从前端传入，也可通过其他关联字段从数据库查询
  if (!params.transactionId) {
    return { code: -1, msg: 'Invalid params' };
  }

  // 2. 查询订单
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_query_order_by_transaction_id',
      // 示例数据 请根据实际业务情况修改
      data: {
        // 请输入实际微信支付订单号
        transaction_id: params.transactionId,
      },
    },
  });

  // [3]. 可校验查询结果是否符合预期

  return { code: 0, data: res.result };
}

/**
 * 申请退款
 * @param {object} params
 * @param {string} params.orderId 订单 ID
 * @param {*} context
 * @returns
 */
async function refund(params, context) {
  // 1. 校验入参
  if (!params.orderId) {
    return { code: -1, msg: 'Invalid params' };
  }

  // 2. 根据订单 ID 查询订单
  const orderRes = await db.collection('order').doc(params.orderId).get();

  if (!orderRes.data?.length) {
    return { code: -1, msg: 'Invalid order' };
  }
  const order = orderRes.data[0];

  // 3. 构造请求数据
  // 商户内部退款单号，商户自行生成商户退款单号，此处仅为代码示例。可存入 `order` 表中
  const outRefundNo = Math.round(Math.random() * 10 ** 13) + Date.now();
  // 退款金额，请根据实际情况修改
  const refundAmount = 1;

  const refundData = {
    transaction_id: order.transactionId,
    out_refund_no: outRefundNo,
    amount: {
      refund: refundAmount, // 退款金额
      total: order.amountTotal, // 原订单金额,
      currency: order.amountCurrency,
    },
  };

  // 4. 发起退款请求
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_refund',
      // 示例数据 请根据实际业务情况修改
      data: refundData,
    },
  });

  // 5. 校验是否退款成功
  if (res.result.code) {
    // 错误处理
    return { code: -1, msg: '错误信息' };
  }

  // 6. 更新订单状态
  const orderUpdateRes = await db
    .collection('order')
    .doc(params.orderId)
    .update({
      data: {
        refunded: 1,
        refundAmount,
        refundTime: Date.now(),
      },
    });

  if (orderUpdateRes.updated !== 1) {
    // 处理更新失败的情况
  }

  return { code: 0, data: res.result };
}

/**
 * 通过商户退款单号查询单笔退款
 * @param {object} params
 * @param {string} params.outRefundNo 商户退款单号
 * @param {*} context
 */
async function refundQuery(params, context) {
  // 1. 校验入参
  if (!params.outRefundNo) {
    return { code: -1, msg: 'Invalid params' };
  }

  // 2. 发起查询请求
  const res = await cloud.callFunction({
    name: 'cloudbase_module',
    data: {
      // 工作流名称
      name: 'wxpay_refund_query',
      // 示例数据 请根据实际业务情况修改
      data: {
        params: {
          out_refund_no: params.outRefundNo, // 填入商户退款单号
        },
      },
    },
  });

  // [3]. 可校验查询结果是否符合预期

  return { code: 0, data: res.result };
}

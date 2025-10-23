这是一个完整的微信支付商品下单云函数示例,包含了商品查询、订单创建、支付、退款等完整流程。

使用前，请确保已经正确安装和配置 **小程序微信支付** 云模板。

若未安装，可前往 模板中心-模板市场-小程序微信支付 进行安装。安装完成后，前往 模板中心-我的模板-小程序微信支付-参数设置，完成必要参数的配置。

以下是调用示例:

1. 创建商品订单:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_order',
    productId: 'product123', // 商品ID
    count: 2, // 购买数量
  },
  success: (res) => {
    console.log('下单成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "prepay_id": "wx2016121516****55928f9b1b2c0********",
    //     "out_trade_no": "202404011800666688888"
    //   }
    // }
  },
});
```

2. 查询订单状态(通过商户订单号):

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_query_order_by_out_trade_no',
    outTradeNo: '202404011800666688888',
  },
  success: (res) => {
    console.log('查询成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_trade_no": "202404011800666688888",
    //     "transaction_id": "4200000001202404011234567890",
    //     "trade_state": "SUCCESS",
    //     "trade_state_desc": "支付成功"
    //   }
    // }
  },
});
```

3. 申请退款:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_refund',
    orderId: 'order123', // 订单ID
  },
  success: (res) => {
    console.log('退款申请成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_refund_no": "202404011800777788888",
    //     "refund_id": "50000000382019052709732678859",
    //     "status": "SUCCESS"
    //   }
    // }
  },
});
```

4. 查询退款状态:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_refund_query',
    outRefundNo: '202404011800777788888',
  },
  success: (res) => {
    console.log('退款查询成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_refund_no": "202404011800777788888",
    //     "refund_status": "SUCCESS",
    //     "success_time": "2024-04-01T16:18:12+08:00",
    //     "amount": {
    //       "refund": 100,
    //       "total": 100,
    //       "currency": "CNY"
    //     }
    //   }
    // }
  },
});
```

注意事项:

1. 商品信息从数据库查询,不要从前端传入
2. 用户openid从云函数上下文获取,不要从前端传入
3. 订单相关信息需要存储到数据库
4. 退款操作需要更新订单状态
5. 建议对所有操作加入适当的错误处理

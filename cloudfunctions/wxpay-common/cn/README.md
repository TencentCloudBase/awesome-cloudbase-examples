这是一个微信支付相关的云函数,包含了统一下单、订单查询、退款等功能。

使用前，请确保已经正确安装和配置 **小程序微信支付** 云模板。

若未安装，可前往 模板中心-模板市场-小程序微信支付 进行安装。安装完成后，前往 模板中心-我的模板-小程序微信支付-参数设置，完成必要参数的配置。

以下是调用示例:

1. 统一下单:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_order',
  },
  success: (res) => {
    console.log('下单成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "prepay_id": "wx2016121516****55928f9b1b2c0********"
    //   }
    // }
  },
  fail: (err) => {
    console.error('下单失败', err);
  },
});
```

2. 通过商户订单号查询订单:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_query_order_by_out_trade_no',
  },
  success: (res) => {
    console.log('查询成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_trade_no": "2024040118006666",
    //     "transaction_id": "4200000001201801011234567890",
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
  name: 'wxpay-common',
  data: {
    type: 'wxpay_refund',
  },
  success: (res) => {
    console.log('退款申请成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_refund_no": "2024040118006666",
    //     "refund_id": "50000000382019052709732678859",
    //     "status": "SUCCESS"
    //   }
    // }
  },
});
```

4. 查询退款:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_refund_query',
  },
  success: (res) => {
    console.log('退款查询成功', res.result);
    // res.result 示例:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_refund_no": "2024040118006666",
    //     "refund_status": "SUCCESS",
    //     "success_time": "2020-12-01T16:18:12+08:00"
    //   }
    // }
  },
});
```

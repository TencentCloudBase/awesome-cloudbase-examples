This is a complete WeChat Pay product order cloud function example, including product query, order creation, payment, refund and other complete processes.

Before use, please ensure that the **Mini Program WeChat Pay** cloud template has been correctly installed and configured.

If not installed, go to Template Center - Template Market - Mini Program WeChat Pay to install. After installation, go to Template Center - My Templates - Mini Program WeChat Pay - Parameter Settings to complete necessary parameter configuration.

Below are usage examples:

1. Create product order:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_order',
    productId: 'product123', // Product ID
    count: 2, // Purchase quantity
  },
  success: (res) => {
    console.log('Order created successfully', res.result);
    // res.result example:
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

2. Query order status (by merchant order number):

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_query_order_by_out_trade_no',
    outTradeNo: '202404011800666688888',
  },
  success: (res) => {
    console.log('Query successful', res.result);
    // res.result example:
    // {
    //   "code": 0,
    //   "data": {
    //     "out_trade_no": "202404011800666688888",
    //     "transaction_id": "4200000001202404011234567890",
    //     "trade_state": "SUCCESS",
    //     "trade_state_desc": "Payment successful"
    //   }
    // }
  },
});
```

3. Apply for refund:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_refund',
    orderId: 'order123', // Order ID
  },
  success: (res) => {
    console.log('Refund application successful', res.result);
    // res.result example:
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

4. Query refund status:

```js
wx.cloud.callFunction({
  name: 'wxpay-product',
  data: {
    type: 'wxpay_refund_query',
    outRefundNo: '202404011800777788888',
  },
  success: (res) => {
    console.log('Refund query successful', res.result);
    // res.result example:
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

Notes:

1. Product information should be queried from database, not passed from frontend
2. User openid should be obtained from cloud function context, not passed from frontend
3. Order related information needs to be stored in database
4. Refund operations need to update order status
5. It is recommended to add appropriate error handling for all operations

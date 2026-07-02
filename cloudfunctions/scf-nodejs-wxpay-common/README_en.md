This is a WeChat Pay related Cloudbase function, including unified order, order query, refund and other functions.

Before use, please ensure that the **Mini Program WeChat Pay** Cloudbase template has been correctly installed and configured.

If not installed, you can go to Template Center - Template Market - Mini Program WeChat Pay to install. After installation, go to Template Center - My Templates - Mini Program WeChat Pay - Parameter Settings to complete the necessary parameter configuration.

The following are calling examples:

1. Unified order:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_order',
  },
  success: (res) => {
    console.log('Order successful', res.result);
    // res.result:
    // {
    //   "code": 0,
    //   "data": {
    //     "prepay_id": "wx2016121516****55928f9b1b2c0********"
    //   }
    // }
  },
  fail: (err) => {
    console.error('Order failed', err);
  },
});
```

2. Query order by merchant order number:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_query_order_by_out_trade_no',
  },
  success: (res) => {
    console.log('Query successful', res.result);
    // res.result:
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

3. Apply for refund:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_refund',
  },
  success: (res) => {
    console.log('Refund application successful', res.result);
    // res.result:
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

4. Query refund:

```js
wx.cloud.callFunction({
  name: 'wxpay-common',
  data: {
    type: 'wxpay_refund_query',
  },
  success: (res) => {
    console.log('Refund query successful', res.result);
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


<!-- tcb-cli-deploy-section -->
## 使用 tcb CLI 部署 / Deploy with tcb CLI

本目录提供了 `cloudbaserc.json` 配置文件，安装并登录 [CloudBase CLI](https://docs.cloudbase.net/cli/intro) 后即可一键部署。

This folder ships a ready-to-use `cloudbaserc.json` so you can deploy with the [CloudBase CLI](https://docs.cloudbase.net/cli/intro) in one command.

```bash
# 1. Install & login
npm install -g @cloudbase/cli
tcb login

# 2. 在本函数目录下部署 / Deploy from this folder
tcb fn deploy -e <YOUR_ENV_ID>

# 3. 调用测试 / Invoke for testing
tcb fn invoke scf-nodejs-wxpay-common --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-wxpay-common -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

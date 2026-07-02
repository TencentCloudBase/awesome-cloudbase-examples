你可以使用这个云函数来管理账户和交易。在小程序中测试调用这个云函数的示例代码如下：

```js
// 创建账户
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'createAccount',
    data: {
      name: '张三',
      initialBalance: 1000
    }
  }
}).then(res => {
  console.log('创建账户结果：', res)
})

// 响应示例
{
  "id": "xxx",
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 转账操作
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'transfer',
    data: {
      fromAccountId: 'account1',
      toAccountId: 'account2',
      amount: 100
    }
  }
}).then(res => {
  console.log('转账结果：', res)
})

// 响应示例
{
  "success": true,
  "recordId": "xxx"
}

// 批量转账
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'batchTransfer',
    data: {
      fromAccountId: 'account1',
      transfers: [
        { toAccountId: 'account2', amount: 50 },
        { toAccountId: 'account3', amount: 50 }
      ]
    }
  }
}).then(res => {
  console.log('批量转账结果：', res)
})

// 响应示例
{
  "success": true,
  "records": ["xxx1", "xxx2"]
}

// 查询余额
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'getBalance',
    data: {
      accountId: 'account1'
    }
  }
}).then(res => {
  console.log('余额查询结果：', res)
})

// 响应示例
{
    "result": 800
}


// 查询交易历史
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'getTransactionHistory',
    data: {
      accountId: 'account1'
    }
  }
}).then(res => {
  console.log('交易历史：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "record3",
      "fromAccount": "account1",
      "toAccount": "account3",
      "amount": 50,
      "status": "success",
      "createdAt": "2023-08-02T08:30:15.000Z",
      "updatedAt": "2023-08-02T08:30:15.000Z"
    },
    {
      "_id": "record2",
      "fromAccount": "account1",
      "toAccount": "account2",
      "amount": 50,
      "status": "success",
      "createdAt": "2023-08-02T08:30:15.000Z",
      "updatedAt": "2023-08-02T08:30:15.000Z"
    },
    {
      "_id": "record1",
      "fromAccount": "account1",
      "toAccount": "account2",
      "amount": 100,
      "status": "success",
      "createdAt": "2023-08-02T08:30:15.000Z",
      "updatedAt": "2023-08-02T08:30:15.000Z"
    }
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

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
tcb fn invoke scf-nodejs-transaction --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-transaction -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

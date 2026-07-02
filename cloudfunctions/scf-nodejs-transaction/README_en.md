You can use this Cloudbase function to manage accounts and transactions. The example code for testing this Cloudbase function in a mini program is as follows:

```js
// Create account
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'createAccount',
    data: {
      name: 'Zhang San',
      initialBalance: 1000
    }
  }
}).then(res => {
  console.log('Create account result:', res)
})

// Response example
{
  "id": "xxx",
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Transfer operation
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
  console.log('Transfer result:', res)
})

// Response example
{
  "success": true,
  "recordId": "xxx"
}

// Batch transfer
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
  console.log('Batch transfer result:', res)
})

// Response example
{
  "success": true,
  "records": ["xxx1", "xxx2"]
}

// Check balance
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'getBalance',
    data: {
      accountId: 'account1'
    }
  }
}).then(res => {
  console.log('Balance check result:', res)
})

// Response example
{
    "result": 800
}


// Query transaction history
wx.cloud.callFunction({
  name: 'transaction-management',
  data: {
    action: 'getTransactionHistory',
    data: {
      accountId: 'account1'
    }
  }
}).then(res => {
  console.log('Transaction history:', res)
})

// Response example
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

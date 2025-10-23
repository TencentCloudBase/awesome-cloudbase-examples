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

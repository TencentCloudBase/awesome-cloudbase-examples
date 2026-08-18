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

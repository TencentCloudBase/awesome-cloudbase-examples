You can use this cloud function for book data analysis. Example code for testing the call to this cloud function in the mini-program is as follows:

```js
// Get author statistics
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getAuthorStats'
  }
}).then(res => {
  console.log('Author Statistics Results:', res)
})

// response
{
  "data": [
    {
      "_id": "liu cixin",
      "totalBooks": 3,
      "totalValue": 167.7,
      "averagePrice": 55.9,
      "books": [
        {
          "title": "Three-Body",
          "price": 55.9,
          "isbn": "9787536692930"
        },
        {
          "title": "Three-Body II: The Dark Forest",
          "price": 55.9,
          "isbn": "9787536693937"
        },
        {
          "title": "Three-Body III: Death's End",
          "price": 55.9,
          "isbn": "9787229030933"
        }
      ]
    }
    // ... more
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}


wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getPriceRangeStats'
  }
}).then(res => {
  console.log('Price Range Statistics Results:', res)
})

// response
{
  "data": [
    {
      "_id": {
        "range": "Under 30 yuan"
      },
      "count": 15,
      "books": [
        {
          "title": "To Live",
          "author": "Yu Hua",
          "price": 28.0
        }
        // ... more
      ],
      "averagePrice": 25.5
    }
    // ... more
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Retrieve the top 5 most expensive books.
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getTopPricedBooks',
    data: {
      limit: 5
    }
  }
}).then(res => {
  console.log('Top 5 Most Expired Books Results:', res)
})

// response
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "A Brief History of Time (Collector's Edition)",
      "author": "Stephen Hawking",
      "price": 199.0,
      "isbn": "9787535732309"
    }
    // ... more
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Retrieve Monthly Statistics
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getMonthlyStats'
  }
}).then(res => {
  console.log('Retrieve Monthly Statistics', res)
})

// response
{
  "data": [
    {
      "_id": {
        "year": 2023,
        "month": 8
      },
      "count": 25,
      "totalValue": 1580.5,
      "books": [
        {
          "title": "Three Body",
          "author": "Liu Cixin",
          "price": 55.9
        }
        // ... more
      ]
    }
    // ... more
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Author's Price Statistics Results:
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getAuthorPriceStats'
  }
}).then(res => {
  console.log('Authors Price Statistics Results:', res)
})

// response
{
  "data": [
    {
      "_id": "Liu Cixin",
      "maxPrice": 59.9,
      "minPrice": 49.9,
      "averagePrice": 55.9,
      "priceRange": 10.0,
      "totalBooks": 3
    }
    // ... more
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}
```

This cloud function demonstrates the usage of the following aggregation operations:

1. `group`: Group statistics - can aggregate by dimensions like author, price range, etc.
2. `sum`/`avg`/`max`/`min`: Common aggregation functions
3. `push`: Preserve detailed data in grouped results
4. `sort`: Result sorting
5. `match`: Filter aggregation results
6. `switch`: Conditional branching
7. `subtract`/`multiply`: Numerical calculations
8. `year`/`month`: Date processing
9. `limit`: Limit result quantity

These aggregation operations can help you perform complex data analysis and obtain valuable statistical information. You can combine these operations according to your actual needs.


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
tcb fn invoke scf-nodejs-book-analytics-aggregate --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-book-analytics-aggregate -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

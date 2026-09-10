你可以使用这个云函数来进行图书数据分析。在小程序中测试调用这个云函数的示例代码如下：

```js
// 获取作者统计信息
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getAuthorStats'
  }
}).then(res => {
  console.log('作者统计结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "刘慈欣",
      "totalBooks": 3,
      "totalValue": 167.7,
      "averagePrice": 55.9,
      "books": [
        {
          "title": "三体",
          "price": 55.9,
          "isbn": "9787536692930"
        },
        {
          "title": "三体2：黑暗森林",
          "price": 55.9,
          "isbn": "9787536693937"
        },
        {
          "title": "三体3：死神永生",
          "price": 55.9,
          "isbn": "9787229030933"
        }
      ]
    }
    // ... 更多作者统计
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 获取价格区间统计
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getPriceRangeStats'
  }
}).then(res => {
  console.log('价格区间统计结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": {
        "range": "30元以下"
      },
      "count": 15,
      "books": [
        {
          "title": "活着",
          "author": "余华",
          "price": 28.0
        }
        // ... 更多图书
      ],
      "averagePrice": 25.5
    }
    // ... 其他价格区间
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 获取最贵的5本书
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getTopPricedBooks',
    data: {
      limit: 5
    }
  }
}).then(res => {
  console.log('最贵图书结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "时间简史（珍藏版）",
      "author": "霍金",
      "price": 199.0,
      "isbn": "9787535732309"
    }
    // ... 更多图书
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 获取月度统计
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getMonthlyStats'
  }
}).then(res => {
  console.log('月度统计结果：', res)
})

// 响应示例
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
          "title": "三体",
          "author": "刘慈欣",
          "price": 55.9
        }
        // ... 更多图书
      ]
    }
    // ... 更多月份
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 获取作者价格统计
wx.cloud.callFunction({
  name: 'book-analytics',
  data: {
    action: 'getAuthorPriceStats'
  }
}).then(res => {
  console.log('作者价格统计结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "刘慈欣",
      "maxPrice": 59.9,
      "minPrice": 49.9,
      "averagePrice": 55.9,
      "priceRange": 10.0,
      "totalBooks": 3
    }
    // ... 更多作者
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}
```

这个云函数演示了以下聚合操作的用法：

1. `group`: 分组统计，可以按作者、价格区间等维度统计
2. `sum`/`avg`/`max`/`min`: 常用的聚合函数
3. `push`: 在分组结果中保存详细数据
4. `sort`: 结果排序
5. `match`: 对聚合结果进行筛选
6. `switch`: 条件分支处理
7. `subtract`/`multiply`: 数值计算
8. `year`/`month`: 日期处理
9. `limit`: 限制结果数量

这些聚合操作可以帮助你进行复杂的数据分析，获取有价值的统计信息。你可以根据实际需求组合使用这些操作。


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

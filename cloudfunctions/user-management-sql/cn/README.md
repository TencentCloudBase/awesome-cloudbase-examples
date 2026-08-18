你可以使用这个云函数来管理用户。

当前仅开放了 select 语句，如果有其他 SQL 语句需求，请通过官方社群联系我们。

在小程序中测试调用这个云函数的示例代码如下：

```js

// 获取单个用户
wx.cloud.callFunction({
  name: 'user-management',
  data: {
    action: 'getUser',
    data: {
      id: 'xxx'
    }
  }
}).then(res => {
  console.log('获取用户结果：', res)
})

// 响应示例
{
  "_id": "xxx",
  "username": "张三",
  "email": "zhangsan@example.com",
  "phone": "13900139000"
  // ...
}

// 分页获取用户列表
wx.cloud.callFunction({
  name: 'user-management',
  data: {
    action: 'listUsers',
    data: {
      page: 1,
      pageSize: 10
    }
  }
}).then(res => {
  console.log('获取用户列表结果：', res)
})

// 响应示例
{
  "list": [
    {
      "_id": "xxx",
      "username": "张三",
      "email": "zhangsan@example.com",
      "phone": "13900139000"
    }
    // ... 更多用户
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}

// 搜索用户
wx.cloud.callFunction({
  name: 'user-management',
  data: {
    action: 'searchUsers',
    data: {
      keyword: '张三'
    }
  }
}).then(res => {
  console.log('搜索用户结果：', res)
})

// 响应示例
[
  {
    "id": 1,
    "username": "张三",
    "email": "zhangsan@example.com",
    "phone": "13900139000",
  }
  // ... 更多匹配的用户
]
```

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
tcb fn invoke scf-nodejs-user-management-sql --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-user-management-sql -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

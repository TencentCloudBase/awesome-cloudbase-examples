You can use this Cloudbase function to manage users.

Currently only SELECT statements are available. If you need other SQL statements, please contact us through the official community.

The example code for testing this Cloudbase function in a mini program is as follows:

```js

// Get single user
wx.cloud.callFunction({
  name: 'user-management',
  data: {
    action: 'getUser',
    data: {
      id: 'xxx'
    }
  }
}).then(res => {
  console.log('Get user result:', res)
})

// Response example
{
  "_id": "xxx",
  "username": "Zhang San",
  "email": "zhangsan@example.com",
  "phone": "13900139000"
  // ...
}

// Get user list with pagination
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
  console.log('Get user list result:', res)
})

// Response example
{
  "list": [
    {
      "_id": "xxx",
      "username": "Zhang San",
      "email": "zhangsan@example.com",
      "phone": "13900139000"
    }
    // ... more users
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}

// Search users
wx.cloud.callFunction({
  name: 'user-management',
  data: {
    action: 'searchUsers',
    data: {
      keyword: 'Zhang San'
    }
  }
}).then(res => {
  console.log('Search users result:', res)
})

// Response example
[
  {
    "id": 1,
    "username": "Zhang San",
    "email": "zhangsan@example.com",
    "phone": "13900139000",
  }
  // ... more matching users
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

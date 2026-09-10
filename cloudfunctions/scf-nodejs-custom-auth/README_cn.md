你可以使用这个云函数来管理用户认证。在小程序中测试调用这个云函数的示例代码如下：

```js
// 用户注册
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'register',
    data: {
      username: 'test@example.com',
      password: 'password123'
    }
  }
}).then(res => {
  console.log('注册结果：', res)
})

// 响应示例
{
  "userId": "user1"
}

// 用户登录
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'login',
    data: {
      username: 'test@example.com',
      password: 'password123'
    }
  }
}).then(res => {
  console.log('登录结果：', res)
})

// 响应示例
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user1"
}

// 刷新访问令牌
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'refreshToken',
    data: {
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}).then(res => {
  console.log('刷新令牌结果：', res)
})

// 响应示例
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// 获取用户信息
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'getUserInfo',
    data: {
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}).then(res => {
  console.log('用户信息：', res)
})

// 响应示例
{
  "_id": "user1",
  "username": "test@example.com",
  "createdAt": "2023-08-02T08:30:15.000Z",
  "updatedAt": "2023-08-02T08:30:15.000Z"
}

// 修改密码
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'changePassword',
    data: {
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      oldPassword: "password123",
      newPassword: "newpassword123"
    }
  }
}).then(res => {
  console.log('修改密码结果：', res)
})

// 响应示例
{
  "success": true
}

// 更新用户信息
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'updateUserInfo',
    data: {
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      userInfo: {
        nickname: "新昵称",
        avatar: "https://example.com/avatar.jpg"
      }
    }
  }
}).then(res => {
  console.log('更新用户信息结果：', res)
})

// 响应示例
{
  "success": true
}
```

这个认证系统包含以下特点：

1. 安全性：

   - SHA256加盐加密密码
   - JWT身份验证
   - 分离accessToken和refreshToken
   - 防止敏感信息泄露

2. 功能完整：

   - 用户注册
   - 用户登录
   - 令牌刷新
   - 获取用户信息
   - 修改密码
   - 更新用户信息

3. 令牌管理：

   - accessToken短期有效（2小时）
   - refreshToken长期有效（7天）
   - Bearer Token认证

4. 错误处理：
   - 用户名重复检查
   - 密码验证
   - 令牌有效性验证
   - 完整的错误提示

使用时注意：

1. 需要修改config.js中的密钥
2. 在生产环境中使用更强的密钥
3. 可以根据需要调整令牌过期时间
4. 建议添加请求频率限制


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
tcb fn invoke scf-nodejs-custom-auth --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-custom-auth -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

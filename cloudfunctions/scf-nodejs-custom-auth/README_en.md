You can use this cloud function to manage user authentication. Example code for testing this cloud function in a mini program:

```js
// User Registration
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
  console.log('Registration result:', res)
})

// Response Example
{
  "userId": "user1"
}

// User Login
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
  console.log('Login result:', res)
})

// Response Example
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user1"
}

// Refresh Access Token
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'refreshToken',
    data: {
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}).then(res => {
  console.log('Token refresh result:', res)
})

// Response Example
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Get User Info
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'getUserInfo',
    data: {
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}).then(res => {
  console.log('User info:', res)
})

// Response Example
{
  "_id": "user1",
  "username": "test@example.com",
  "createdAt": "2023-08-02T08:30:15.000Z",
  "updatedAt": "2023-08-02T08:30:15.000Z"
}

// Change Password
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
  console.log('Password change result:', res)
})

// Response Example
{
  "success": true
}

// Update User Info
wx.cloud.callFunction({
  name: 'custom-auth',
  data: {
    action: 'updateUserInfo',
    data: {
      authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      userInfo: {
        nickname: "New Nickname",
        avatar: "https://example.com/avatar.jpg"
      }
    }
  }
}).then(res => {
  console.log('User info update result:', res)
})

// Response Example
{
  "success": true
}
```

This authentication system includes the following features:

1. Security:

   - SHA256 salted password encryption
   - JWT authentication
   - Separate accessToken and refreshToken
   - Prevent sensitive information leakage

2. Complete functionality:

   - User registration
   - User login
   - Token refresh
   - Get user information
   - Change password
   - Update user information

3. Token management:

   - Short-term accessToken validity (2 hours)
   - Long-term refreshToken validity (7 days)
   - Bearer Token authentication

4. Error handling:
   - Username duplication check
   - Password verification
   - Token validity verification
   - Complete error messages

Usage notes:

1. Need to modify keys in config.js
2. Use stronger keys in production environment
3. Can adjust token expiration time as needed
4. Recommended to add request rate limiting


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

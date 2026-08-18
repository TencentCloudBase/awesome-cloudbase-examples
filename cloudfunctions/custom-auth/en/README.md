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

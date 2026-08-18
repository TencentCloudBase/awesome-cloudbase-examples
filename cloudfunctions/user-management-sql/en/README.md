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

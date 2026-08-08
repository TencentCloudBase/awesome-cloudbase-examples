You can use this Cloudbase function to manage posts. Example code for testing this Cloudbase function in a mini program:

```js
// Create post
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'createPost',
    data: {
      title: 'My First Post',
      content: 'This is the post content',
      author: 'John Doe',
    }
  }
}).then(res => {
  console.log('Create post result:', res)
})

// Response example
{
  "id": "64c9f5a79f6c8e0001b60b0a",
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Update post
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'updatePost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a',
      post: {
        content: 'Updated post content'
      }
    }
  }
}).then(res => {
  console.log('Update post result:', res)
})

// Response example
{
  "id": "64c9f5a79f6c8e0001b60b0a",
  "updated": 1
}

// Delete post
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'deletePost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a'
    }
  }
}).then(res => {
  console.log('Delete post result:', res)
})

// Response example
{
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1",
  "deleted": 1
}

// Get single post
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'getPost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a'
    }
  }
}).then(res => {
  console.log('Get post result:', res)
})

// Response example
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "My First Post",
      "content": "This is the post content",
      "author": "John Doe"
      // ...
    }
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// Get paginated post list
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'listPosts',
    data: {
      page: 1,
      pageSize: 10
    }
  }
}).then(res => {
  console.log('Get post list result:', res)
})

// Response example
{
  "list": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "My First Post",
      "content": "Updated post content",
      "author": "John Doe"
      // ...
    }
    // ... more posts
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}

// Search posts
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'searchPosts',
    data: {
      keyword: 'technology'
    }
  }
}).then(res => {
  console.log('Search posts result:', res)
})

// Response example
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "My First Post",
      "content": "Updated post content",
      "author": "John Doe"
      // ...
    }
    // more posts
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}
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
tcb fn invoke scf-nodejs-post-management-collection --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-post-management-collection -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

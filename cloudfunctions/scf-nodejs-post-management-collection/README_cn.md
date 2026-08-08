你可以使用这个云函数来管理文章。在小程序中测试调用这个云函数的示例代码如下：

```js
// 创建文章
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'createPost',
    data: {
      title: '我的第一篇文章',
      content: '这是文章内容',
      author: '张三',
    }
  }
}).then(res => {
  console.log('创建文章结果：', res)
})

// 响应示例
{
  "id": "64c9f5a79f6c8e0001b60b0a",
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 更新文章
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'updatePost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a',
      post: {
        content: '更新后的文章内容'
      }
    }
  }
}).then(res => {
  console.log('更新文章结果：', res)
})

// 响应示例
{
  "id": "64c9f5a79f6c8e0001b60b0a",
  "updated": 1
}

// 删除文章
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'deletePost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a'
    }
  }
}).then(res => {
  console.log('删除文章结果：', res)
})

// 响应示例
{
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1",
  "deleted": 1
}

// 获取单篇文章
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'getPost',
    data: {
      id: '64c9f5a79f6c8e0001b60b0a'
    }
  }
}).then(res => {
  console.log('获取文章结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "我的第一篇文章",
      "content": "这是文章内容",
      "author": "张三"
      // ...
    }
  ],
  "requestId": "1735086147_0.36272387876657_33594-193f355e_1"
}

// 分页获取文章列表
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
  console.log('获取文章列表结果：', res)
})

// 响应示例
{
  "list": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "我的第一篇文章",
      "content": "更新后的文章内容",
      "author": "张三"
      // ...
    }
    // ... 更多文章
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}

// 搜索文章
wx.cloud.callFunction({
  name: 'post-management',
  data: {
    action: 'searchPosts',
    data: {
      keyword: '技术'
    }
  }
}).then(res => {
  console.log('搜索文章结果：', res)
})

// 响应示例
{
  "data": [
    {
      "_id": "64c9f5a79f6c8e0001b60b0a",
      "title": "我的第一篇文章",
      "content": "更新后的文章内容",
      "author": "张三"
      // ...
    }
    // 更多文章
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

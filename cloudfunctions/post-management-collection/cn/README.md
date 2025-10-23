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

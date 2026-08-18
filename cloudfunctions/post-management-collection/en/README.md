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

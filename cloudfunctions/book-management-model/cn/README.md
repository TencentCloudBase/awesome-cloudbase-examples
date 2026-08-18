你可以使用这个云函数来管理图书。在小程序中测试调用这个云函数的示例代码如下：

```js
// 创建图书
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'createBook',
      data: {
        title: '三体',
        author: '刘慈欣',
        price: 39.9,
        isbn: '9787536692930',
      },
    },
  })
  .then((res) => {
    console.log('创建成功：', res);
  });

// 更新图书
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'updateBook',
      data: {
        id: 'xxx', // 图书ID
        book: {
          price: 45.0,
        },
      },
    },
  })
  .then((res) => {
    console.log('更新成功：', res);
  });

// 删除图书
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'deleteBook',
      data: {
        id: 'xxx', // 图书ID
      },
    },
  })
  .then((res) => {
    console.log('删除成功：', res);
  });

// 获取单本图书
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'getBook',
      data: {
        id: 'xxx', // 图书ID
      },
    },
  })
  .then((res) => {
    console.log('图书信息：', res);
  });

// 获取图书列表
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'listBooks',
      data: {},
    },
  })
  .then((res) => {
    console.log('图书列表：', res);
  });

// 搜索图书
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'searchBooks',
      data: {
        keyword: '三体',
      },
    },
  })
  .then((res) => {
    console.log('搜索结果：', res);
  });
```

返回数据结构示例：

```js
// 创建图书返回
{
  "data": {
    "id": "xxx" // 图书 id
  }
}

// 更新/删除图书返回
{
  "data": {
    "count": 1 // 影响行数
  }
}

// 获取单本图书
{
  "data": {
    "_id": "xxx",
    "title": "三体",
    "author": "刘慈欣",
    "price": 39.9,
    "isbn": "9787536692930"
    // ...
  }
}

// 获取图书列表返回
{
  "data": {
    "records": [
      {
        "_id": "xxx",
        "title": "三体",
        "author": "刘慈欣",
        "price": 39.9,
        "isbn": "9787536692930"
      }
      // ...更多图书
    ],
    "total": 10
  }
}

// 搜索图书返回
{
  "data": {
    "records": [
      {
        "_id": "xxx",
        "title": "三体",
        "author": "刘慈欣",
        "price": 39.9,
        "isbn": "9787536692930"
      }
      // ...更多图书
    ],
  }
}
```

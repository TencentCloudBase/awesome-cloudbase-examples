You can use this cloud function to manage books. Example code for testing the call to this cloud function in the mini-program is as follows:


```js
// Create books
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'createBook',
      data: {
        title: 'Three Body',
        author: 'Liu Cixin',
        price: 39.9,
        isbn: '9787536692930',
      },
    },
  })
  .then((res) => {
    console.log('Create success：', res);
  });

// Update books
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'updateBook',
      data: {
        id: 'xxx', // book ID
        book: {
          price: 45.0,
        },
      },
    },
  })
  .then((res) => {
    console.log('Update success：', res);
  });

// Delete book
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'deleteBook',
      data: {
        id: 'xxx', // book ID
      },
    },
  })
  .then((res) => {
    console.log('Delete success：', res);
  });

// get single book
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'getBook',
      data: {
        id: 'xxx', // book ID
      },
    },
  })
  .then((res) => {
    console.log('Book Info：', res);
  });

// get book list
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'listBooks',
      data: {},
    },
  })
  .then((res) => {
    console.log('Book List：', res);
  });

// Search books
wx.cloud
  .callFunction({
    name: 'book-management',
    data: {
      action: 'searchBooks',
      data: {
        keyword: 'Three-Body',
      },
    },
  })
  .then((res) => {
    console.log('Search results：', res);
  });
```

Example of returned data structure:

```js
// create response
{
  "data": {
    "id": "xxx" // book id
  }
}

// update/delete response
{
  "data": {
    "count": 1 // affect rows
  }
}

// get single book response
{
  "data": {
    "_id": "xxx",
    "title": "Three-Body",
    "author": "Liu Cixin",
    "price": 39.9,
    "isbn": "9787536692930"
    // ...
  }
}

// get book list response
{
  "data": {
    "records": [
      {
        "_id": "xxx",
        "title": "Three-Body"",
        "author": "Liu Cixin",
        "price": 39.9,
        "isbn": "9787536692930"
      }
      // ...more
    ],
    "total": 10
  }
}

// search book response
{
  "data": {
    "records": [
      {
        "_id": "xxx",
        "title": "Three-Body",
        "author": "Liu Cixin",
        "price": 39.9,
        "isbn": "9787536692930"
      }
      // ...more
    ],
  }
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
tcb fn invoke scf-nodejs-book-management-model --params '{"key":"value"}' -e <YOUR_ENV_ID>

# 4. 查看日志 / Tail logs
tcb fn log scf-nodejs-book-management-model -e <YOUR_ENV_ID>
```

> 如果只想一次性部署整个仓库内的所有函数，可在 `cloudfunctions/` 根目录执行 `tcb fn deploy --all -e <YOUR_ENV_ID>`。
> To deploy every function in the repo at once, run `tcb fn deploy --all -e <YOUR_ENV_ID>` from the `cloudfunctions/` root.

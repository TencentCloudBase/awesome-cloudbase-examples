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

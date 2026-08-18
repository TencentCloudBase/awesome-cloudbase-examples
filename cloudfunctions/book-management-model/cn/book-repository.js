const { models } = require('./init-models');

// 创建图书 create books
async function createBook(book) {
  return await models.book.create({
    data: book,
  });
}

// 更新图书 update books
async function updateBook(id, book) {
  return await models.book.update({
    data: book,
    filter: {
      where: {
        _id: { $eq: id },
      },
    },
  });
}

// 删除图书 delete books
async function deleteBook(id) {
  return await models.book.delete({
    filter: {
      where: {
        _id: { $eq: id },
      },
    },
  });
}

// 获取单本图书 get single book
async function getBook(id) {
  return await models.book.get({
    filter: {
      where: {
        _id: { $eq: id },
      },
    },
  });
}

// 获取图书列表 get book list
async function listBooks() {
  return await models.book.list({
    where: {},
    getCount: true,
  });
}

// 搜索图书 search books
async function searchBooks(keyword) {
  return await models.book.list({
    filter: {
      where: {
        title: { $regex: keyword },
      },
    },
  });
}

module.exports = {
  createBook,
  updateBook,
  deleteBook,
  getBook,
  listBooks,
  searchBooks,
};

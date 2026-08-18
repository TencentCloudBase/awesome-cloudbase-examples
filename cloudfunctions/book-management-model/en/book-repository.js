const { models } = require('./init-models');

//create books
async function createBook(book) {
  return await models.book.create({
    data: book,
  });
}

//update books
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

//delete books
async function deleteBook(id) {
  return await models.book.delete({
    filter: {
      where: {
        _id: { $eq: id },
      },
    },
  });
}

//get single book
async function getBook(id) {
  return await models.book.get({
    filter: {
      where: {
        _id: { $eq: id },
      },
    },
  });
}

//get book list
async function listBooks() {
  return await models.book.list({
    where: {},
    getCount: true,
  });
}

//search books
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

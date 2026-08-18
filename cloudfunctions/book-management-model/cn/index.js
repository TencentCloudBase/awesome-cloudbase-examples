'use strict';
const bookRepository = require('./book-repository');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'createBook':
      return await bookRepository.createBook(data);

    case 'updateBook':
      return await bookRepository.updateBook(data.id, data.book);

    case 'deleteBook':
      return await bookRepository.deleteBook(data.id);

    case 'getBook':
      return await bookRepository.getBook(data.id);

    case 'listBooks':
      return await bookRepository.listBooks(data.page, data.pageSize);

    case 'searchBooks':
      return await bookRepository.searchBooks(data.keyword);

    default:
      throw new Error('Unkown Operation');
  }
};

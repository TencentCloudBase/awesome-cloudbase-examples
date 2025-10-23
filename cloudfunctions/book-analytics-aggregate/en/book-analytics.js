const { db, $ } = require('./db');
const book = db.collection('book');

// Count books and total value by author
async function getAuthorStats() {
  return book
    .aggregate()
    .group({
      _id: '$author',
      totalBooks: $.sum(1),
      totalValue: $.sum($.multiply(['$price', 1])),
      averagePrice: $.avg('$price'),
      books: $.push({
        title: '$title',
        price: '$price',
        isbn: '$isbn',
      }),
    })
    .sort({
      totalBooks: -1,
    })
    .end();
}

// Statistics on book distribution by price range
async function getPriceRangeStats() {
  return book
    .aggregate()
    .group({
      _id: {
        range: $.switch({
          branches: [
            { case: $.lte(['$price', 30]), then: 'Under 30' },
            { case: $.lte(['$price', 60]), then: '30-60' },
            { case: $.lte(['$price', 100]), then: '60-100' },
          ],
          default: 'Up 100',
        }),
      },
      count: $.sum(1),
      books: $.push({
        title: '$title',
        author: '$author',
        price: '$price',
      }),
      averagePrice: $.avg('$price'),
    })
    .sort({
      '_id.range': 1,
    })
    .end();
}

// Retrieve the top N books by price
async function getTopPricedBooks(limit = 5) {
  return book
    .aggregate()
    .sort({
      price: -1,
    })
    .limit(limit)
    .end();
}

// Count book entries by month
async function getMonthlyStats() {
  return book
    .aggregate()
    .group({
      _id: {
        year: { $year: { $toDate: '$createdAt' } },
        month: { $month: { $toDate: '$createdAt' } },
      },
      count: $.sum(1),
      totalValue: $.sum('$price'),
      books: $.push({
        title: '$title',
        author: '$author',
        price: '$price',
      }),
    })
    .sort({
      '_id.year': -1,
      '_id.month': -1,
    })
    .end();
}

// Retrieve author price statistics
async function getAuthorPriceStats() {
  return book
    .aggregate()
    .group({
      _id: '$author',
      maxPrice: { $max: '$price' },
      minPrice: { $min: '$price' },
      averagePrice: { $avg: '$price' },
      totalBooks: { $sum: 1 },
    })
    .match({
      totalBooks: { $gte: 2 }, // Only count authors with at least 2 books
    })
    .addFields({
      priceRange: { $subtract: ['$maxPrice', '$minPrice'] },
    })
    .sort({
      averagePrice: -1,
    })
    .end();
}

module.exports = {
  getAuthorStats,
  getPriceRangeStats,
  getTopPricedBooks,
  getMonthlyStats,
  getAuthorPriceStats,
};

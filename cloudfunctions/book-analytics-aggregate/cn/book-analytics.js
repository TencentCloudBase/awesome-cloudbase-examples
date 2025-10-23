const { db, $ } = require('./db');
const book = db.collection('book');

// 按作者统计图书数量和总价值
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

// 按价格区间统计图书分布
async function getPriceRangeStats() {
  return book
    .aggregate()
    .group({
      _id: {
        range: $.switch({
          branches: [
            { case: $.lte(['$price', 30]), then: '30元以下' },
            { case: $.lte(['$price', 60]), then: '30-60元' },
            { case: $.lte(['$price', 100]), then: '60-100元' },
          ],
          default: '100元以上',
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

// 获取价格最高的N本书
async function getTopPricedBooks(limit = 5) {
  return book
    .aggregate()
    .sort({
      price: -1,
    })
    .limit(limit)
    .end();
}

// 按月份统计图书入库情况
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

// 获取作者的价格统计信息
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
      totalBooks: { $gte: 2 }, // 只统计至少有2本书的作者
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

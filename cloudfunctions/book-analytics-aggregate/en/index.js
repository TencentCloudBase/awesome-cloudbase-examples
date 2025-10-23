'use strict';
const bookAnalytics = require('./book-analytics');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'getAuthorStats':
      return await bookAnalytics.getAuthorStats();

    case 'getPriceRangeStats':
      return await bookAnalytics.getPriceRangeStats();

    case 'getTopPricedBooks':
      return await bookAnalytics.getTopPricedBooks(data?.limit);

    case 'getMonthlyStats':
      return await bookAnalytics.getMonthlyStats();

    case 'getAuthorPriceStats':
      return await bookAnalytics.getAuthorPriceStats();

    default:
      throw new Error('未知的操作类型');
  }
};

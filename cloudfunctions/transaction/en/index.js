'use strict';
const transactionService = require('./transaction-service');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'createAccount':
      return await transactionService.createAccount(data.name, data.initialBalance);

    case 'transfer':
      return await transactionService.transfer(data.fromAccountId, data.toAccountId, data.amount);

    case 'batchTransfer':
      return await transactionService.batchTransfer(data.fromAccountId, data.transfers);

    case 'getBalance':
      return await transactionService.getBalance(data.accountId);

    case 'getTransactionHistory':
      return await transactionService.getTransactionHistory(data.accountId);

    default:
      throw new Error('Unknown operation type');
  }
};

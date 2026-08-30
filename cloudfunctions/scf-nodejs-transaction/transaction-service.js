const { db, _ } = require('./db');
const accounts = db.collection('account');
const records = db.collection('transaction_record');

// 创建账户 / Create a new account with an optional initial balance
async function createAccount(name, initialBalance = 0) {
  return await accounts.add({
    name,
    balance: initialBalance,
  });
}

// 转账操作 / Transfer money from one account to another (atomic transaction)
async function transfer(fromAccountId, toAccountId, amount) {
  const transaction = await db.startTransaction();

  try {
    // 1. 检查账户是否存在
    // 1. Make sure both accounts exist
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    const toAccount = await transaction.collection('account').doc(toAccountId).get();

    if (!fromAccount.data || !toAccount.data) {
      // 账户不存在 / Account does not exist
      throw new Error('账户不存在');
    }

    // 2. 检查余额是否充足
    // 2. Ensure the source account has enough balance
    if (fromAccount.data.balance < amount) {
      // 余额不足 / Insufficient balance
      throw new Error('余额不足');
    }

    // 3. 创建交易记录
    // 3. Create a pending transaction record
    const record = await transaction.collection('transaction_record').add({
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount,
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    // 4. 更新转出账户余额
    // 4. Debit the source account
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-amount),
      });

    // 5. 更新转入账户余额
    // 5. Credit the destination account
    await transaction
      .collection('account')
      .doc(toAccountId)
      .update({
        balance: _.inc(amount),
      });
    console.log(record);
    // 6. 更新交易状态为成功
    // 6. Mark the transaction record as successful
    await transaction.collection('transaction_record').doc(record.id).update({
      status: 'success',
      updatedAt: db.serverDate(),
    });

    // 7. 提交事务
    // 7. Commit the transaction
    await transaction.commit();

    return {
      success: true,
      recordId: record.id,
    };
  } catch (err) {
    // 发生错误时回滚事务
    // Roll back the transaction on any error
    await transaction.rollback();
    return err;
  }
}

// 批量转账操作 / Batch transfer from a single source account to multiple targets
async function batchTransfer(fromAccountId, transfers) {
  const transaction = await db.startTransaction();

  try {
    // 1. 检查转出账户
    // 1. Validate the source account
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    if (!fromAccount.data) {
      // 转出账户不存在 / Source account does not exist
      throw new Error('转出账户不存在');
    }
    // 2. 计算总转账金额
    // 2. Calculate the total transfer amount
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

    // 3. 检查余额是否充足
    // 3. Ensure the source has enough balance to cover the whole batch
    if (fromAccount.data.balance < totalAmount) {
      // 余额不足 / Insufficient balance
      throw new Error('余额不足');
    }

    // 4. 执行每笔转账
    // 4. Process each individual transfer
    const records = [];
    for (const transfer of transfers) {
      // 4.1 检查转入账户
      // 4.1 Validate the destination account
      const toAccount = await transaction.collection('account').doc(transfer.toAccountId).get();
      if (!toAccount.data) {
        // 转入账户 ... 不存在 / Destination account ... does not exist
        throw new Error(`转入账户 ${transfer.toAccountId} 不存在`);
      }

      // 4.2 创建交易记录
      // 4.2 Create a pending transaction record
      const record = await transaction.collection('transaction_record').add({
        fromAccount: fromAccountId,
        toAccount: transfer.toAccountId,
        amount: transfer.amount,
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      });
      records.push(record.id);

      // 4.3 更新转入账户余额
      // 4.3 Credit the destination account
      await transaction
        .collection('account')
        .doc(transfer.toAccountId)
        .update({
          balance: _.inc(transfer.amount),
        });
    }

    // 5. 更新转出账户总余额
    // 5. Debit the source account by the total batch amount
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-totalAmount),
      });

    // 6. 更新所有交易状态为成功
    // 6. Mark every transaction record as successful
    for (const recordId of records) {
      await transaction.collection('transaction_record').doc(recordId).update({
        status: 'success',
        updatedAt: db.serverDate(),
      });
    }

    // 7. 提交事务
    // 7. Commit the transaction
    await transaction.commit();

    return {
      success: true,
      records,
    };
  } catch (err) {
    await transaction.rollback();
    return err;
  }
}

// 获取账户余额 / Get the current balance of an account
async function getBalance(accountId) {
  const account = await accounts.doc(accountId).get();
  return account.data[0].balance || 0;
}

// 获取账户交易记录 / Get transaction history for an account (both in and out)
async function getTransactionHistory(accountId) {
  return await records
    .where(_.or([{ fromAccount: accountId }, { toAccount: accountId }]))
    .orderBy('createdAt', 'desc')
    .get();
}

module.exports = {
  createAccount,
  transfer,
  batchTransfer,
  getBalance,
  getTransactionHistory,
};

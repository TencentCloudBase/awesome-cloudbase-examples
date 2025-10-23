const { db, _ } = require('./db');
const accounts = db.collection('account');
const records = db.collection('transaction_record');

// 创建账户
async function createAccount(name, initialBalance = 0) {
  return await accounts.add({
    name,
    balance: initialBalance,
  });
}

// 转账操作
async function transfer(fromAccountId, toAccountId, amount) {
  const transaction = await db.startTransaction();

  try {
    // 1. 检查账户是否存在
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    const toAccount = await transaction.collection('account').doc(toAccountId).get();

    if (!fromAccount.data || !toAccount.data) {
      throw new Error('账户不存在');
    }

    // 2. 检查余额是否充足
    if (fromAccount.data.balance < amount) {
      throw new Error('余额不足');
    }

    // 3. 创建交易记录
    const record = await transaction.collection('transaction_record').add({
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount,
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    // 4. 更新转出账户余额
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-amount),
      });

    // 5. 更新转入账户余额
    await transaction
      .collection('account')
      .doc(toAccountId)
      .update({
        balance: _.inc(amount),
      });
    console.log(record);
    // 6. 更新交易状态为成功
    await transaction.collection('transaction_record').doc(record.id).update({
      status: 'success',
      updatedAt: db.serverDate(),
    });

    // 7. 提交事务
    await transaction.commit();

    return {
      success: true,
      recordId: record.id,
    };
  } catch (err) {
    // 发生错误时回滚事务
    await transaction.rollback();
    return err;
  }
}

// 批量转账操作
async function batchTransfer(fromAccountId, transfers) {
  const transaction = await db.startTransaction();

  try {
    // 1. 检查转出账户
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    if (!fromAccount.data) {
      throw new Error('转出账户不存在');
    }
    // 2. 计算总转账金额
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

    // 3. 检查余额是否充足
    if (fromAccount.data.balance < totalAmount) {
      throw new Error('余额不足');
    }

    // 4. 执行每笔转账
    const records = [];
    for (const transfer of transfers) {
      // 4.1 检查转入账户
      const toAccount = await transaction.collection('account').doc(transfer.toAccountId).get();
      if (!toAccount.data) {
        throw new Error(`转入账户 ${transfer.toAccountId} 不存在`);
      }

      // 4.2 创建交易记录
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
      await transaction
        .collection('account')
        .doc(transfer.toAccountId)
        .update({
          balance: _.inc(transfer.amount),
        });
    }

    // 5. 更新转出账户总余额
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-totalAmount),
      });

    // 6. 更新所有交易状态为成功
    for (const recordId of records) {
      await transaction.collection('transaction_record').doc(recordId).update({
        status: 'success',
        updatedAt: db.serverDate(),
      });
    }

    // 7. 提交事务
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

// 获取账户余额
async function getBalance(accountId) {
  const account = await accounts.doc(accountId).get();
  return account.data[0].balance || 0;
}

// 获取账户交易记录
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

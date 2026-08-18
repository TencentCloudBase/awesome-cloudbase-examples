const { db, _ } = require('./db');
const accounts = db.collection('account');
const records = db.collection('transaction_record');

// Create account
async function createAccount(name, initialBalance = 0) {
  return await accounts.add({
    name,
    balance: initialBalance,
  });
}

// Transfer operation
async function transfer(fromAccountId, toAccountId, amount) {
  const transaction = await db.startTransaction();

  try {
    // 1. Check if accounts exist
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    const toAccount = await transaction.collection('account').doc(toAccountId).get();

    if (!fromAccount.data || !toAccount.data) {
      throw new Error('Account does not exist');
    }

    // 2. Check if balance is sufficient
    if (fromAccount.data.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // 3. Create transaction record
    const record = await transaction.collection('transaction_record').add({
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount,
      status: 'pending',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    });

    // 4. Update source account balance
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-amount),
      });

    // 5. Update destination account balance
    await transaction
      .collection('account')
      .doc(toAccountId)
      .update({
        balance: _.inc(amount),
      });
    console.log(record);
    // 6. Update transaction status to success
    await transaction.collection('transaction_record').doc(record.id).update({
      status: 'success',
      updatedAt: db.serverDate(),
    });

    // 7. Commit transaction
    await transaction.commit();

    return {
      success: true,
      recordId: record.id,
    };
  } catch (err) {
    // Rollback transaction when error occurs
    await transaction.rollback();
    return err;
  }
}

// Batch transfer operation
async function batchTransfer(fromAccountId, transfers) {
  const transaction = await db.startTransaction();

  try {
    // 1. Check source account
    const fromAccount = await transaction.collection('account').doc(fromAccountId).get();
    if (!fromAccount.data) {
      throw new Error('Source account does not exist');
    }
    // 2. Calculate total transfer amount
    const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

    // 3. Check if balance is sufficient
    if (fromAccount.data.balance < totalAmount) {
      throw new Error('Insufficient balance');
    }

    // 4. Execute each transfer
    const records = [];
    for (const transfer of transfers) {
      // 4.1 Check destination account
      const toAccount = await transaction.collection('account').doc(transfer.toAccountId).get();
      if (!toAccount.data) {
        throw new Error(`Destination account ${transfer.toAccountId} does not exist`);
      }

      // 4.2 Create transaction record
      const record = await transaction.collection('transaction_record').add({
        fromAccount: fromAccountId,
        toAccount: transfer.toAccountId,
        amount: transfer.amount,
        status: 'pending',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      });
      records.push(record.id);

      // 4.3 Update destination account balance
      await transaction
        .collection('account')
        .doc(transfer.toAccountId)
        .update({
          balance: _.inc(transfer.amount),
        });
    }

    // 5. Update total source account balance
    await transaction
      .collection('account')
      .doc(fromAccountId)
      .update({
        balance: _.inc(-totalAmount),
      });

    // 6. Update all transaction status to success
    for (const recordId of records) {
      await transaction.collection('transaction_record').doc(recordId).update({
        status: 'success',
        updatedAt: db.serverDate(),
      });
    }

    // 7. Commit transaction
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

// Get account balance
async function getBalance(accountId) {
  const account = await accounts.doc(accountId).get();
  return account.data[0].balance || 0;
}

// Get account transaction history
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

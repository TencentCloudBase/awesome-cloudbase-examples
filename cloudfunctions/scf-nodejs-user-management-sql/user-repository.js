const { models } = require('./db');

async function getUserById(id) {
  const sql = 'SELECT * FROM user WHERE _id = {{id}}';
  const result = await models.$runSQL(sql, { id });
  return result.data.executeResultList[0];
}

async function listUsers(page = 1, pageSize = 10) {
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT * FROM user 
    ORDER BY createdAt DESC 
    LIMIT {{pageSize}} OFFSET {{offset}}
  `;
  const result = await models.$runSQL(sql, { pageSize, offset });

  return {
    list: result.data.executeResultList,
    total: result.data.total,
    page,
    pageSize,
  };
}

async function searchUsers(keyword) {
  const sql = `
    SELECT * FROM user 
    WHERE username LIKE {{searchPattern}} 
    OR email LIKE {{searchPattern}} 
    OR phone LIKE {{searchPattern}}
  `;
  const searchPattern = `%${keyword}%`;
  const result = await models.$runSQL(sql, { searchPattern });
  return result.data.executeResultList;
}

module.exports = {
  getUserById,
  listUsers,
  searchUsers,
};

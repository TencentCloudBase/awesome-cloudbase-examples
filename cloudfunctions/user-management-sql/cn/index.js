'use strict';
const userRepository = require('./user-repository');

exports.main = async (event, context) => {
  const { action, data } = event;

  switch (action) {
    case 'getUser':
      return await userRepository.getUserById(data.id);

    case 'listUsers':
      return await userRepository.listUsers(data.page, data.pageSize);

    case 'searchUsers':
      return await userRepository.searchUsers(data.keyword);

    default:
      throw new Error('未知的操作类型');
  }
};

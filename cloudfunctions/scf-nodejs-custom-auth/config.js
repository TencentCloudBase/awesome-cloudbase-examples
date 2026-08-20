module.exports = {
  jwt: {
    accessTokenSecret: 'your-access-token-secret-key',
    refreshTokenSecret: 'your-refresh-token-secret-key',
    accessTokenExpire: '2h',
    refreshTokenExpire: '7d',
  },
  auth: {
    saltLength: 16,
    tokenPrefix: 'Bearer ',
  },
};

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');

// 生成随机盐
function generateSalt(length = config.auth.saltLength) {
  return crypto.randomBytes(length).toString('hex');
}

// SHA256加盐加密
function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

// 验证密码
function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

// 生成访问令牌
function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.accessTokenSecret, {
    expiresIn: config.jwt.accessTokenExpire,
  });
}

// 生成刷新令牌
function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshTokenSecret, {
    expiresIn: config.jwt.refreshTokenExpire,
  });
}

// 验证令牌
function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// 从请求头提取令牌
function extractToken(authorization) {
  if (!authorization?.startsWith(config.auth.tokenPrefix)) {
    return null;
  }
  return authorization.slice(config.auth.tokenPrefix.length);
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
};

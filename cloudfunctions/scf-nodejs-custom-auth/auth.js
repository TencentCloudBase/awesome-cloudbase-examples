const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');

// 生成随机盐
// Generate a random salt as a hex string
function generateSalt(length = config.auth.saltLength) {
  return crypto.randomBytes(length).toString('hex');
}

// SHA256加盐加密
// SHA-256 hashing with salt
function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

// 验证密码
// Verify a password by recomputing the hash and comparing
function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

// 生成访问令牌
// Issue a short-lived JWT access token
function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.accessTokenSecret, {
    expiresIn: config.jwt.accessTokenExpire,
  });
}

// 生成刷新令牌
// Issue a long-lived JWT refresh token
function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshTokenSecret, {
    expiresIn: config.jwt.refreshTokenExpire,
  });
}

// 验证令牌
// Verify a JWT token; returns the decoded payload, or null when invalid/expired
function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// 从请求头提取令牌
// Extract the bearer-style token from an Authorization header value
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

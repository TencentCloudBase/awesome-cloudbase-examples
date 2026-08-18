const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const config = require('./config');

// Generate random salt
function generateSalt(length = config.auth.saltLength) {
  return crypto.randomBytes(length).toString('hex');
}

// SHA256 salted encryption
function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

// Verify password
function verifyPassword(password, salt, hash) {
  return hashPassword(password, salt) === hash;
}

// Generate access token
function generateAccessToken(userId) {
  return jwt.sign({ userId, type: 'access' }, config.jwt.accessTokenSecret, {
    expiresIn: config.jwt.accessTokenExpire,
  });
}

// Generate refresh token
function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, config.jwt.refreshTokenSecret, {
    expiresIn: config.jwt.refreshTokenExpire,
  });
}

// Verify token
function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

// Extract token from request header
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

const cloudbase = require('@cloudbase/node-sdk');
const {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  extractToken,
} = require('./auth');
const config = require('./config');

const app = cloudbase.init({});

const db = app.database();
const _ = db.command;
const users = db.collection('user');

exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    switch (action) {
      case 'register':
        return await register(data.username, data.password);

      case 'login':
        return await login(data.username, data.password);

      case 'refreshToken':
        return await refreshToken(data.refreshToken);

      case 'getUserInfo':
        return await getUserInfo(data.authorization);

      case 'changePassword':
        return await changePassword(data.authorization, data.oldPassword, data.newPassword);

      case 'updateUserInfo':
        return await updateUserInfo(data.authorization, data.userInfo);

      default:
        throw new Error('Unknown operation type');
    }
  } catch (error) {
    return {
      error: error.message,
    };
  }
};

// User registration
async function register(username, password) {
  // Check if user exists
  const existUser = await users
    .where({
      username,
    })
    .get();

  if (existUser.data.length > 0) {
    throw new Error('User already exists');
  }

  // Generate salt and password hash
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  // Create user
  const user = {
    username,
    password: passwordHash,
    salt,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate(),
  };
  const result = await users.add(user);

  return { userId: result._id };
}

// User login
async function login(username, password) {
  const userResult = await users
    .where({
      username,
    })
    .get();

  const user = userResult.data[0];

  if (!user) {
    throw new Error('User does not exist');
  }

  if (!verifyPassword(password, user.salt, user.password)) {
    throw new Error('Incorrect password');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return {
    accessToken,
    refreshToken,
    userId: user._id,
  };
}

// Refresh access token
async function refreshToken(refreshToken) {
  const decoded = verifyToken(refreshToken, config.jwt.refreshTokenSecret);
  if (!decoded || decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  // Generate new access token
  const accessToken = generateAccessToken(decoded.userId);
  return { accessToken };
}

// Get user information
async function getUserInfo(authorization) {
  const token = extractToken(authorization);
  if (!token) {
    throw new Error('Access token not provided');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    throw new Error('Invalid access token');
  }

  const userResult = await users.doc(decoded.userId).get();
  const user = userResult.data[0];
  if (!user) {
    throw new Error('User does not exist');
  }

  // Remove sensitive information
  const { password, salt, ...userInfo } = user;
  return userInfo;
}

// Change password
async function changePassword(authorization, oldPassword, newPassword) {
  const token = extractToken(authorization);
  if (!token) {
    throw new Error('Access token not provided');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    throw new Error('Invalid access token');
  }

  const userResult = await users.doc(decoded.userId).get();
  const user = userResult.data[0];

  if (!user) {
    throw new Error('User does not exist');
  }

  if (!verifyPassword(oldPassword, user.salt, user.password)) {
    throw new Error('Incorrect old password');
  }

  const newSalt = generateSalt();
  const newPasswordHash = hashPassword(newPassword, newSalt);

  await users.doc(decoded.userId).update({
    password: newPasswordHash,
    salt: newSalt,
    updatedAt: db.serverDate(),
  });

  return { success: true };
}

// Update user information
async function updateUserInfo(authorization, userInfo) {
  const token = extractToken(authorization);
  if (!token) {
    throw new Error('Access token not provided');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    throw new Error('Invalid access token');
  }

  // Prevent updating sensitive fields
  const { password, salt, _id, username, ...safeUserInfo } = userInfo;

  await users.doc(decoded.userId).update({
    ...safeUserInfo,
    updatedAt: db.serverDate(),
  });

  return { success: true };
}

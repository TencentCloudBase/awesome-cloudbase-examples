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
        // 未知的操作类型 / Unknown action type
        throw new Error('未知的操作类型');
    }
  } catch (error) {
    return {
      error: error.message,
    };
  }
};

// 用户注册 / User registration
async function register(username, password) {
  // 检查用户是否存在
  // Check whether the username has already been registered
  const existUser = await users
    .where({
      username,
    })
    .get();

  if (existUser.data.length > 0) {
    // 用户已存在 / User already exists
    throw new Error('用户已存在');
  }

  // 生成盐和密码哈希
  // Generate a salt and hash the password
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  // 创建用户
  // Persist the new user record
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

// 用户登录 / User login
async function login(username, password) {
  const userResult = await users
    .where({
      username,
    })
    .get();

  const user = userResult.data[0];

  if (!user) {
    // 用户不存在 / User does not exist
    throw new Error('用户不存在');
  }

  if (!verifyPassword(password, user.salt, user.password)) {
    // 密码错误 / Wrong password
    throw new Error('密码错误');
  }

  // 生成令牌
  // Generate access and refresh tokens
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  return {
    accessToken,
    refreshToken,
    userId: user._id,
  };
}

// 刷新访问令牌 / Refresh the access token
async function refreshToken(refreshToken) {
  const decoded = verifyToken(refreshToken, config.jwt.refreshTokenSecret);
  if (!decoded || decoded.type !== 'refresh') {
    // 无效的刷新令牌 / Invalid refresh token
    throw new Error('无效的刷新令牌');
  }

  // 生成新的访问令牌
  // Issue a new access token using the userId carried in the refresh token
  const accessToken = generateAccessToken(decoded.userId);
  return { accessToken };
}

// 获取用户信息 / Get user profile
async function getUserInfo(authorization) {
  const token = extractToken(authorization);
  if (!token) {
    // 未提供访问令牌 / Access token not provided
    throw new Error('未提供访问令牌');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    // 无效的访问令牌 / Invalid access token
    throw new Error('无效的访问令牌');
  }

  const userResult = await users.doc(decoded.userId).get();
  const user = userResult.data[0];
  if (!user) {
    // 用户不存在 / User does not exist
    throw new Error('用户不存在');
  }

  // 删除敏感信息
  // Strip out sensitive fields before returning
  const { password, salt, ...userInfo } = user;
  return userInfo;
}

// 修改密码 / Change password
async function changePassword(authorization, oldPassword, newPassword) {
  const token = extractToken(authorization);
  if (!token) {
    // 未提供访问令牌 / Access token not provided
    throw new Error('未提供访问令牌');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    // 无效的访问令牌 / Invalid access token
    throw new Error('无效的访问令牌');
  }

  const userResult = await users.doc(decoded.userId).get();
  const user = userResult.data[0];

  if (!user) {
    // 用户不存在 / User does not exist
    throw new Error('用户不存在');
  }

  if (!verifyPassword(oldPassword, user.salt, user.password)) {
    // 原密码错误 / Old password is incorrect
    throw new Error('原密码错误');
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

// 更新用户信息 / Update user profile
async function updateUserInfo(authorization, userInfo) {
  const token = extractToken(authorization);
  if (!token) {
    // 未提供访问令牌 / Access token not provided
    throw new Error('未提供访问令牌');
  }

  const decoded = verifyToken(token, config.jwt.accessTokenSecret);
  if (!decoded || decoded.type !== 'access') {
    // 无效的访问令牌 / Invalid access token
    throw new Error('无效的访问令牌');
  }

  // 防止更新敏感字段
  // Whitelist update fields by stripping sensitive ones
  const { password, salt, _id, username, ...safeUserInfo } = userInfo;

  await users.doc(decoded.userId).update({
    ...safeUserInfo,
    updatedAt: db.serverDate(),
  });

  return { success: true };
}

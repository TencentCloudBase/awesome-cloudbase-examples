import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID - 从环境变量获取
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID;

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id-here' && ENV_ID !== undefined;

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @returns {Object} 云开发实例
 */
export const init = (config = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
  };

  return cloudbase.init(appConfig);
};

/**
 * 默认的云开发实例
 */
export const app = init();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    const message = '❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 复制 .env.example 文件为 .env\n2. 在 .env 文件中设置 VITE_CLOUDBASE_ENV_ID=您的环境ID\n3. 重启开发服务器\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
    console.error(message);
    return false;
  }
  return true;
};

/**
 * 用户名密码登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Promise} 登录状态
 */
export const signInWithPassword = async (username, password) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  const auth = app.auth();

  try {
    await auth.signIn({
      username,
      password,
    });

    const loginState = await auth.getLoginState();
    console.log('用户名密码登录成功:', loginState);
    return loginState;
  } catch (error) {
    console.error('用户名密码登录失败:', error);
    throw error;
  }
};

/**
 * 匿名登录
 * @returns {Promise} 登录状态
 */
export const signInAnonymously = async () => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  const auth = app.auth();

  try {
    await auth.signInAnonymously();
    const loginState = await auth.getLoginState();
    console.log('匿名登录成功:', loginState);
    return loginState;
  } catch (error) {
    console.error('匿名登录失败:', error);
    throw error;
  }
};

/**
 * 获取当前登录状态
 * @returns {Promise} 登录状态
 */
export const getLoginState = async () => {
  // 检查环境配置
  if (!checkEnvironment()) {
    return null;
  }

  const auth = app.auth();

  try {
    const loginState = await auth.getLoginState();
    return loginState;
  } catch (error) {
    console.error('获取登录状态失败:', error);
    return null;
  }
};

/**
 * 确保用户已登录（如未登录会执行匿名登录）
 * @returns {Promise} 登录状态
 */
export const ensureLogin = async () => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  const auth = app.auth();

  try {
    // 检查当前登录状态
    let loginState = await auth.getLoginState();

    if (loginState) {
      // 已登录，返回当前状态
      console.log('用户已登录');
      return loginState;
    } else {
      // 未登录，执行登录
      console.log('用户未登录，执行登录...');

      // 默认采用匿名登录,
      await auth.signInAnonymously();
      // 也可以换成跳转SDK 内置的登录页面，支持账号密码登录/手机号登录/微信登录
      // await auth.toDefaultLoginPage()

      let loginState = await auth.getLoginState()
      return loginState;
    }
  } catch (error) {
    console.error('确保登录失败:', error);

    // 即使登录失败，也返回一个降级的登录状态，确保应用可以继续运行
    console.warn('使用降级登录状态，应用将以离线模式运行');
    return {
      isLoggedIn: true,
      user: {
        uid: 'offline_' + Date.now(),
        isAnonymous: true,
        isOffline: true
      }
    };
  }
};



/**
 * 退出登录（注意：匿名登录无法退出）
 * @returns {Promise}
 */
export const logout = async () => {
  const auth = app.auth();

  try {
    const loginScope = await auth.loginScope();

    if (loginScope === 'anonymous') {
      console.warn('匿名登录状态无法退出');
      return { success: false, message: '匿名登录状态无法退出' };
    }

    await auth.signOut();
    return { success: true, message: '已成功退出登录' };
  } catch (error) {
    console.error('退出登录失败:', error);
    throw error;
  }
};

// 默认导出
export default {
  init,
  app,
  signInWithPassword,
  signInAnonymously,
  getLoginState,
  ensureLogin,
  logout,
  checkEnvironment,
  isValidEnvId
};

import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID，使用时请替换为您的环境ID
export const ENV_ID = import.meta.env.VITE_ENV_ID || 'your-env-id';

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

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
    const message = '❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.js 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
    console.error(message);
    return false;
  }
  return true;
};

/**
 * 执行登录
 * @returns {Promise} 登录状态
 */
const login = async () => {
  const auth = app.auth();
  
  try {
    // 默认采用匿名登录,
    await auth.signInAnonymously();
    // 也可以换成跳转SDK 内置的登录页面，支持账号密码登录/手机号登录/微信登录
    // await auth.toDefaultLoginPage()

    return auth.getLoginState();
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

/**
 * 确保用户已登录
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
    
    if (loginState && loginState.user) {
      // 已登录，返回当前状态
      console.log('用户已登录');
      return loginState;
    } else {
      // 未登录，执行匿名登录
      console.log('用户未登录，执行登录...');
      loginState = await login();
      return loginState;
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
};

/**
 * 退出登录（注意：匿名登录无法退出）
 * @returns {Promise}
 */
export const logout = async () => {
  const auth = app.auth();
  
  try {
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
  ensureLogin,
  logout,
  checkEnvironment,
  isValidEnvId
}; 
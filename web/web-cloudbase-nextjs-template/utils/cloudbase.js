import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = process.env.NEXT_PUBLIC_ENV_ID || 'your-env-id';
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

export const init = (config = {}) => {
  return cloudbase.init({
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
  });
};

export const app = init();

export const checkEnvironment = () => {
  if (!isValidEnvId) {
    console.error('❌ 云开发环境ID未配置\n\n请在 .env.local 中设置 NEXT_PUBLIC_ENV_ID 或修改 utils/cloudbase.js 中的 ENV_ID');
    return false;
  }
  return true;
};

export const ensureLogin = async () => {
  if (!checkEnvironment()) throw new Error('环境ID未配置');
  const auth = app.auth();
  try {
    let loginState = await auth.getLoginState();
    if (loginState) return loginState;
    await auth.signInAnonymously();
    return await auth.getLoginState();
  } catch (error) {
    console.error('登录失败:', error);
    return { isLoggedIn: true, user: { uid: 'offline_' + Date.now(), isAnonymous: true, isOffline: true } };
  }
};

export const logout = async () => {
  const auth = app.auth();
  try {
    const loginScope = await auth.loginScope();
    if (loginScope === 'anonymous') return { success: false, message: '匿名登录状态无法退出' };
    await auth.signOut();
    return { success: true, message: '已成功退出登录' };
  } catch (error) {
    console.error('退出登录失败:', error);
    throw error;
  }
};

export default { init, app, ensureLogin, logout, checkEnvironment, isValidEnvId };

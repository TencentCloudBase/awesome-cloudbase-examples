import cloudbase from '@cloudbase/js-sdk'
import adapter from '@cloudbase/adapter-uni-app'

// 使用 UniApp 适配器
cloudbase.useAdapters(adapter,{uni: uni});

// 云开发环境ID，使用时请替换为您的环境ID
const ENV_ID: string = 'your-env-id';

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @returns {Object} 云开发实例
 */
export const init = (config: any = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
    appSign: 'uni-app',//凭证描述
    appSecret: {
        appAccessKeyId: 1,//凭证版本
        appAccessKey: 'your-appAccessKey'//凭证
    }
  };

  return cloudbase.init(appConfig);
};

/**
 * 默认的云开发实例
 */
export const app = init();


/**
 * 云开发认证实例
 */
export const auth = app.auth();

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    const message = '❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.ts 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并重新运行\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
    console.error(message);
    return false;
  }
  return true;
};


/**
 * 执行登录
 * @returns {Promise} 登录状态
 */
export const login = async () => {
  // const auth = app.auth();
  try {
    // 默认采用匿名登录
    await auth.signInAnonymously();
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
};

/**
 * 微信小程序手机号一键登录
 * @param phoneCode - 从 getPhoneNumber 事件中获取的动态令牌
 */
export const signInWithPhoneAuth = async (phoneCode: string) => {
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  const loginState = await auth.signInWithPhoneAuth({
    phoneCode: phoneCode
  });
  return loginState;
};

/**
 * 【新增】微信小程序 OpenID 静默登录
 */
export const signInWithOpenId = async () => {
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }
  // 直接调用 auth 模块的同名方法
  const loginState = await auth.signInWithOpenId();
  return loginState;
};

/**
 * 获取手机验证码
 * @param {string} phoneNumber - 手机号码
 * @returns {Promise} 验证信息
 */
export const getPhoneVerification = async (phoneNumber: string) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  // const auth = app.auth();

  try {
    // 格式化手机号为国际格式
    let formattedPhone = phoneNumber;
    
    // 如果是中国大陆手机号（11位数字），添加 +86 前缀
    if (/^1[3-9]\d{9}$/.test(phoneNumber)) {
      formattedPhone = `+86 ${phoneNumber}`;
    }
    // 如果已经是国际格式，直接使用
    else if (/^\+\d{1,3}\s\d{4,20}$/.test(phoneNumber)) {
      formattedPhone = phoneNumber;
    }
    else {
      throw new Error('手机号格式不正确');
    }
    // console.log('格式化后的手机号:', formattedPhone);
    const verificationInfo = await auth.getVerification({
      phone_number: formattedPhone,
    });
    console.log('验证码发送成功');
    return verificationInfo;
  } catch (error) {
    console.error('获取验证码失败:', error);
    throw error;
  }
};

/**
 * 使用手机验证码登录
 * @param {Object} params - 登录参数
 * @param {any} params.verificationInfo - 验证信息对象
 * @param {string} params.verificationCode - 验证码
 * @param {string} params.phoneNum - 手机号码
 * @returns {Promise} 登录状态
 */
export const signInWithPhoneCode = async (params: {
  verificationInfo: any;
  verificationCode: string;
  phoneNum: string;
}) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }


  // const auth = app.auth();
  const { verificationInfo, verificationCode, phoneNum } = params;

  try {
    await auth.signInWithSms({
      verificationInfo,
      verificationCode,
      phoneNum,
    });
    
    const loginState = await auth.getLoginState();
    console.log('手机验证码登录成功');
    return loginState;
  } catch (error) {
    console.error('手机验证码登录失败:', error);
    throw error;
  }
};

/**
 * 密码登录
 * @param {string} username - 手机号码（格式：+86 13800000000）/邮箱/用户名
 * @param {string} password - 密码
 * @returns {Promise} 登录状态
 */
export const signInWithPassword = async (username: string, password: string) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  // const auth = app.auth();

  try {
    let formattedUsername = username;
    let loginType = '';

    // 判断输入类型并格式化
    if (/^1[3-9]\d{9}$/.test(username)) {
      // 中国大陆手机号（11位数字）
      formattedUsername = `+86 ${username}`;
      loginType = '手机号';
    } 
    else if (/^\+\d{1,3}\s\d{4,20}$/.test(username)) {
      // 已经是国际格式的手机号
      formattedUsername = username;
      loginType = '手机号';
    }
    else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(username)) {
      // 邮箱格式
      formattedUsername = username;
      loginType = '邮箱';
    }
    else if (/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      // 用户名格式（3-20位字母、数字、下划线）
      formattedUsername = username;
      loginType = '用户名';
    }
    else {
      // 格式不符合任何规则，但仍然尝试登录（可能是其他格式的用户名）
      formattedUsername = username;
      loginType = '用户名';
    }

    await auth.signIn({
      username: formattedUsername,
      password: password,
    });

    const loginState = await auth.getLoginState();
    console.log(`${loginType}密码登录成功`);
    return loginState;
  } catch (error) {
    throw error;
  }
};


/**
 * 获取邮箱验证码
 * @param {string} email - 邮箱地址
 * @returns {Promise} 验证信息
 */
export const getEmailVerification = async (email: string) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  // const auth = app.auth();

  try {
    const verificationInfo = await auth.getVerification({
      email: email,
    });
    console.log('邮箱验证码发送成功');
    return verificationInfo;
  } catch (error) {
    console.error('获取邮箱验证码失败:', error);
    throw error;
  }
};

/**
 * 使用邮箱验证码登录
 * @param {Object} params - 登录参数
 * @param {any} params.verificationInfo - 验证信息对象
 * @param {string} params.verificationCode - 验证码
 * @param {string} params.email - 邮箱地址
 * @returns {Promise} 登录状态
 */
export const signInWithEmailCode = async (params: {
  verificationInfo: any;
  verificationCode: string;
  email: string;
}) => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error('环境ID未配置');
  }

  // const auth = app.auth();
  const { verificationInfo, verificationCode, email } = params;

  try {
    await auth.signInWithEmail({
      verificationInfo,
      verificationCode,
      email,
    });
    
    // const loginState = await auth.getLoginState();
    console.log('邮箱验证码登录成功');
    // return loginState;
  } catch (error) {
    console.error('邮箱验证码登录失败:', error);
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

  // const auth = app.auth();

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
       await login();
       loginState = await auth.getLoginState();
      return loginState;
      return false;
    }
  } catch (error) {
    console.error('登录失败:', error);
    return false;
  }
};

/**
 * 初始化云开发
 * 自动进行匿名登录
 */
export async function initCloudBase() {
  try {
    await ensureLogin();
    console.log('云开发初始化成功');
    return true;
  } catch (error) {
    console.error('云开发初始化失败:', error);
    return false;
  }
}

/**
 * 退出登录（注意：匿名登录无法退出）
 * @returns {Promise}
 */
export const logout = async () => {
  // const auth = app.auth();

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
  login,
  logout,
  checkEnvironment,
  isValidEnvId,
  initCloudBase,
  getPhoneVerification,
  signInWithPhoneCode,
  getEmailVerification,
  signInWithEmailCode,
  signInWithPassword,
  signInWithPhoneAuth,
  signInWithOpenId
};
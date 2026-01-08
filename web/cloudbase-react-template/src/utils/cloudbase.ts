import cloudbase from "@cloudbase/js-sdk";

// 云开发环境ID，使用时请替换为您的环境ID
export const ENV_ID = import.meta.env.VITE_ENV_ID || "your-env-id";

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== "your-env-id";

// 客户端Publishable Key, 可前往https://tcb.cloud.tencent.com/dev?envId={env}#/env/apikey获取
const PUBLISHABLE_KEY =  import.meta.env.VITE_PUBLISHABLE_KEY || "";

/**
 * 初始化云开发实例
 * @param {Object} config - 初始化配置
 * @param {string} config.env - 环境ID，默认使用ENV_ID
 * @param {number} config.timeout - 超时时间，默认15000ms
 * @param {number} config.accessKey - 客户端Publishable Key，默认使用PUBLISHABLE_KEY
 */
export const init = (config: { env?: string; timeout?: number; accessKey?: string; } = {}) => {
  const appConfig = {
    env: config.env || ENV_ID,
    timeout: config.timeout || 15000,
    accessKey: config.accessKey || PUBLISHABLE_KEY,
    auth: { detectSessionInUrl: true },
  };

  if (!appConfig.accessKey) {
    console.warn("客户端 Publishable Key 未配置");
  }

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
    const message =
      "❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.js 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb";
    console.error(message);
    return false;
  }
  return true;
};

type AuthInstance = ReturnType<typeof app.auth>;
type SignInRes = Awaited<ReturnType<AuthInstance["getSession"]>>;

interface OfflineLoginState {
  isLoggedIn: boolean;
  user: {
    uid: string;
    isAnonymous: boolean;
  };
}

/**
 * 检查用户登录态
 * @returns {Promise} 登录状态
 */
export const checkLogin = async (): Promise<
  SignInRes['data']['session'] | OfflineLoginState
> => {
  // 检查环境配置
  if (!checkEnvironment()) {
    throw new Error("环境ID未配置");
  }

  const auth = app.auth;

  try {
    // 检查当前登录状态
    let { data } = await auth.getSession();

    if (data.session) {
      console.log("用户已登录");

      return data.session;
    } else {
      throw new Error("用户未登录");
    }
  } catch (error) {
    console.warn(error);
    
    let { data } = await auth.getClaims();

    if (data.claims?.sub === "anon") {
      console.log("将使用 Publishable Key 进行访问");
    }

    return {
      isLoggedIn: false,
      user: {
        uid: data.claims?.sub || '',
        isAnonymous: true,
      },
    };
  }
};

/**
 * 退出登录
 */
export const logout = async (): Promise<{ success: boolean; message: string }> => {
  const auth = app.auth;

  try {
    await auth.signOut();
    return { success: true, message: "已成功退出登录" };
  } catch (error) {
    console.error("退出登录失败:", error);
    throw error;
  }
};

// 默认导出
export default {
  init,
  app,
  checkLogin,
  logout,
  checkEnvironment,
  isValidEnvId,
};

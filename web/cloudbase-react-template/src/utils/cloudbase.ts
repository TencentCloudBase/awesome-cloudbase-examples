import cloudbase from "@cloudbase/js-sdk";

// 云开发环境ID，使用时请替换为您的环境ID
export const ENV_ID = import.meta.env.VITE_ENV_ID || "your-env-id";

// 检查环境ID是否已配置
export const isValidEnvId = ENV_ID && ENV_ID !== "your-env-id";

// 客户端 Publishable Key，可前往 https://tcb.cloud.tencent.com/dev?envId={env}#/env/apikey 获取
const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || "";

/**
 * 初始化云开发实例
 */
export const init = (config: { env?: string; timeout?: number; accessKey?: string } = {}) => {
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

window.app = app

/**
 * 获取 auth 实例
 */
export const auth = app.auth;

/**
 * 检查环境配置是否有效
 */
export const checkEnvironment = () => {
  if (!isValidEnvId) {
    console.error(
      "❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n" +
      "1. 创建 .env.local 文件\n" +
      "2. 设置 VITE_ENV_ID=your-env-id 和 VITE_PUBLISHABLE_KEY=your-key\n" +
      "3. 重启开发服务器\n\n" +
      "获取环境ID：https://console.cloud.tencent.com/tcb"
    );
    return false;
  }
  return true;
};

/**
 * 检查用户登录态（使用 getSession API）
 *
 * 注意：accessKey 初始化后，废弃的 getLoginState() 会返回带 uid 的对象（即使未登录）。
 * 应使用 auth.getSession() — 未登录时返回 data.session === undefined。
 */
export const checkLogin = async () => {
  if (!checkEnvironment()) {
    throw new Error("环境ID未配置");
  }

  const { data, error } = await auth.getSession();

  if (error) {
    console.warn("获取会话失败:", error.message);
    return { isLoggedIn: false, session: null, user: null };
  }

  if (data.session && !data.session.user?.is_anonymous) {
    // 已登录（非匿名用户）
    return { isLoggedIn: true, session: data.session, user: data.session.user };
  }

  // 未登录或匿名用户
  return { isLoggedIn: false, session: null, user: null };
};

/**
 * 退出登录
 */
export const logout = async () => {
  const { error } = await auth.signOut();
  if (error) {
    console.error("退出登录失败:", error.message);
    throw error;
  }
  return { success: true, message: "已成功退出登录" };
};

export default { init, app, auth, checkLogin, logout, checkEnvironment, isValidEnvId };

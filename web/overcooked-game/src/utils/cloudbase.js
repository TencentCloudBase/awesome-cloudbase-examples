import cloudbase from '@cloudbase/js-sdk';

// 云开发环境ID
const ENV_ID = import.meta.env.VITE_ENV_ID || 'your-env-id';

// 检查环境ID是否已配置
const isValidEnvId = ENV_ID && ENV_ID !== 'your-env-id';

// 登录状态缓存
let loginStateCache = null;
let isLoggingIn = false;

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
		const message =
			'❌ 云开发环境ID未配置\n\n请按以下步骤配置：\n1. 打开 src/utils/cloudbase.js 文件\n2. 将 ENV_ID 变量的值替换为您的云开发环境ID\n3. 保存文件并刷新页面\n\n获取环境ID：https://console.cloud.tencent.com/tcb';
		console.error(message);
		return false;
	}
	return true;
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
		const loginState = auth.hasLoginState();

		if (loginState) {
			// 登录态有效，返回当前登录状态
			return auth.getLoginState();
		} else {
			// 没有登录态，或者登录态已经失效
			await auth.signInAnonymously();
			return auth.getLoginState();
		}
	} catch (error) {
		console.error('登录失败:', error);
		throw error;
	}
};

/**
 * 调用云函数
 * @param {Object} options - 调用参数
 * @param {string} options.name - 云函数名称
 * @param {Object} options.data - 传递给云函数的数据
 * @returns {Promise} 云函数调用结果
 */
export const callFunction = async (options) => {
	try {
		// 确保用户已登录
		const loginState = await ensureLogin();

		// 如果是离线模式，返回模拟结果
		if (loginState.user && loginState.user.isOffline) {
			console.warn('离线模式：无法调用云函数', options.name);
			throw new Error('离线模式：无法调用云函数');
		}

		// 调用云函数
		const result = await app.callFunction(options);
		return result;
	} catch (error) {
		console.error('调用云函数失败:', error);
		throw error;
	}
};

/**
 * 清除登录状态缓存（用于强制重新登录）
 */
export const clearLoginCache = () => {
	loginStateCache = null;
	isLoggingIn = false;
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
		clearLoginCache(); // 清除缓存
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
	callFunction,
	clearLoginCache,
	isValidEnvId,
};

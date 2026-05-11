/**
 * 微信公众号通用配置
 *
 * 环境变量：
 *   OA_APPID     - 公众号 AppID
 *   OA_APPSECRET - 公众号 AppSecret
 */

const config = {
  appId: process.env.OA_APPID || '',
  appSecret: (process.env.OA_APPSECRET || '').replace(/\\n/g, '\n'),
};

/**
 * 校验配置完整性
 * 启动时调用，配置缺失时打印警告（不强制退出，方便本地调试）
 */
function validateConfig() {
  const errors = [];

  if (!config.appId) errors.push('OA_APPID（公众号 AppID）未配置');
  if (!config.appSecret) errors.push('OA_APPSECRET（公众号 AppSecret）未配置');

  if (errors.length > 0) {
    console.warn('⚠️  配置校验警告（共 ' + errors.length + ' 项）:');
    errors.forEach((msg, idx) => console.warn(`  ${idx + 1}. ${msg}`));
  } else {
    console.log('[config] 配置校验通过，AppID:', config.appId);
  }

  return errors;
}

module.exports = { ...config, validateConfig };

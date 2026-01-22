/**
 * Express 中间件：检查必需的环境变量
 *
 * 在处理请求前验证大模型配置是否完整，
 * 如果缺少配置则返回 503 错误，避免后续调用失败。
 *
 * 必需的环境变量：
 * - OPENAI_MODEL: 模型名称
 * - OPENAI_API_KEY: API 密钥
 * - OPENAI_BASE_URL: API 基础地址
 */
export function checkOpenAIEnvMiddleware(_req, res, next) {
  const missingVars = [];

  if (!process.env.OPENAI_MODEL) {
    missingVars.push("OPENAI_MODEL");
  }
  if (!process.env.OPENAI_API_KEY) {
    missingVars.push("OPENAI_API_KEY");
  }
  if (!process.env.OPENAI_BASE_URL) {
    missingVars.push("OPENAI_BASE_URL");
  }

  // 缺少环境变量时返回 503，提示用户配置
  if (missingVars.length > 0) {
    res.status(503).json({
      error: "Service Unavailable",
      message: `Missing required environment variables: ${missingVars.join(", ")}`,
      code: "MISSING_ENV_CONFIG",
    });
    return;
  }

  next();
}

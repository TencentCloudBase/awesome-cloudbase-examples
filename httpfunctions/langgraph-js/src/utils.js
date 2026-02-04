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

/**
 * 从标准 Web Request 的 Authorization header 中解析 JWT
 *
 * @param {Request} request - 标准 Web Request 对象
 * @returns {{ id: string, [key: string]: any } | null} 解析后的用户信息，失败返回 null
 *
 * @example
 * const userInfo = parseJwtFromRequest(request);
 * if (userInfo) {
 *   console.log(userInfo.id); // JWT 中的 sub 字段
 * }
 */
export function parseJwtFromRequest(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return null;
    }

    // 支持 "Bearer <token>" 格式
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return null;
    }

    // JWT 格式: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // 解码 payload (第二部分)
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );

    return {
      id: payload.sub,
      ...payload,
    };
  } catch {
    return null;
  }
}

import { jwtDecode } from "jwt-decode";

/**
 * 用户认证中间件
 * 从 Authorization header 中提取 JWT token，解析用户 ID 并注入到 forwardedProps
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function detectCloudbaseUserMiddleware(_req, res, next) {
  try {
    // 如果已经有 visitorBizId，跳过处理
    if (_req.body?.forwardedProps?.visitorBizId) {
      throw new Error("already has visitorBizId");
    }
    // 获取 Authorization header（Express 会将 header 名称转为小写）
    const user = _req.headers["authorization"];
    if (user) {
      // 提取 Bearer token 中的 JWT 部分
      const jwt = user.split(" ")[1];
      if (!jwt) {
        throw new Error("invalid jwt");
      }
      // 解码 JWT 获取用户信息
      const decoded = jwtDecode(jwt);
      if (!decoded || !decoded.sub) {
        throw new Error("invalid jwt");
      }
      // 将用户 ID 注入到 forwardedProps.visitorBizId
      _req.body.forwardedProps = {
        ...(_req.body?.forwardedProps || {}),
        visitorBizId: decoded.sub,
      };
    }
  } catch (e) {
    // 忽略错误，继续处理请求
  } finally {
    next();
  }
}

import {
  Middleware,
  RunAgentInput,
  BaseEvent,
  AbstractAgent,
} from "@ag-ui/client";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { Observable } from "rxjs";

/**
 * 用户认证中间件
 * 从 Authorization header 中提取 JWT token，解析用户 ID 并注入到 forwardedProps
 */
/**
 * 用户认证中间件
 * 从 Authorization header 中提取 JWT token，解析用户 ID 并注入到 input.state
 */
export class DetectCloudbaseUserMiddleware extends Middleware {
  _req: Request;
  constructor(req: Request) {
    super();
    this._req = req;
  }
  run(input: RunAgentInput, next: AbstractAgent): Observable<BaseEvent> {
    let jwtString: string = "";
    let jwtToken: JwtPayload = {};
    try {
      // 获取 Authorization header
      const user = this._req.headers.get("Authorization");
      if (user) {
        // 提取 Bearer token 中的 JWT 部分
        const jwt = user.split(" ")[1];
        if (!jwt) {
          throw new Error("invalid jwt");
        }
        jwtString = jwt;
        // 解码 JWT 获取用户信息
        const decoded = jwtDecode(jwt);
        if (!decoded || !decoded.sub) {
          throw new Error("invalid jwt");
        }
        jwtToken = decoded;
      }
    } catch (e) {
      // 忽略错误，继续处理请求
    }
    if (jwtToken?.sub) {
      // 将用户 ID 注入到 input.state.__request_context__
      return next.run({
        ...input,
        state: {
          ...input.state,
          __request_context__: {
            id: jwtToken.sub,
            jwt: jwtString,
          },
        },
      });
    } else {
      return next.run(input);
    }
  }
}

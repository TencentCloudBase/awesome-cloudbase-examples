/**
 * Context Adapter
 * 将 Express Request + 环境变量转换为 CloudbaseContext 对象
 */

import { CloudbaseContext, RequestContext } from '../types/context.js'
import { getEnvConfig } from '../config/env.js'
import { randomId } from '../utils/helpers.js'

/**
 * 从 AG-UI RunAgentInput.state 中提取请求上下文
 */
export function getRequestContext(state: Record<string, unknown>): RequestContext | null {
  const ctx = state?.__request_context__ as RequestContext
  return ctx || null
}

/**
 * 从请求上下文创建 CloudbaseContext
 */
export function createCloudbaseContext(
  requestContext: RequestContext | null,
  options?: {
    userId?: string
    ctxId?: string
  }
): CloudbaseContext {
  const envConfig = getEnvConfig()
  
  // 从 JWT 或选项中获取 userId
  const userId = options?.userId || 
    requestContext?.user?.id || 
    'anonymous'

  // 生成请求 ID
  const ctxId = options?.ctxId || randomId(16)

  // 构建 HTTP 上下文（如果有请求对象）
  let httpContext: CloudbaseContext['httpContext'] | undefined
  if (requestContext?.request) {
    const req = requestContext.request
    httpContext = {
      url: req.url || '',
      httpMethod: req.method || 'POST',
      headers: {}
    }
    
    // 复制请求头
    if (req.headers) {
      req.headers.forEach((value, key) => {
        httpContext!.headers[key] = value
      })
    }
  }

  return {
    ctxId,
    httpContext,
    extendedContext: {
      envId: envConfig.envId,
      userId,
      accessToken: envConfig.apiKey
    }
  }
}



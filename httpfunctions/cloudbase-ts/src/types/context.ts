/**
 * CloudbaseContext - 适配 Express 环境的上下文
 * 不再依赖 TcbContext，所有配置从环境变量读取
 */

export interface CloudbaseContext {
  // 请求上下文
  httpContext?: {
    url: string
    httpMethod: string
    headers: Record<string, string>
  }
  // 扩展上下文
  extendedContext?: {
    envId: string
    userId: string
    accessToken?: string
  }
  // 请求 ID
  ctxId: string
}

/**
 * AG-UI 请求上下文
 */
export interface RequestContext {
  user: {
    id: string
    jwt?: Record<string, unknown>
  }
  request: Request
}

/**
 * 聊天历史项
 */
export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * SSE 事件发送器接口
 */
export interface SSESender {
  send: (data: string) => void
}

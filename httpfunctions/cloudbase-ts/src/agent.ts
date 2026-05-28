/**
 * CloudbaseAgent
 * 实现 AG-UI AbstractAgent 接口，包装 MainChatService 和 LLMCommunicator
 */

import {
  AbstractAgent,
  RunAgentInput,
  EventType,
  Message,
  BaseEvent
} from '@ag-ui/client'
import { Observable } from 'rxjs'

import { BotContext } from './types/bot_context.js'
import { ChatHistoryItem } from './types/context.js'
import type { CloudbaseContext } from './types/context.js'
import { IBotConfig, botConfig } from './config/bot_config.js'
import { BotInfo } from './config/bot_info.js'
import { MainChatService } from './services/chat_main.service.js'
import { LLMCommunicator } from './llm/llm_communicator.js'
import {
  createCloudbaseContext,
  getRequestContext
} from './adapters/context-adapter.js'
import { replaceEnvId, replaceReadMe } from './utils/tcb.js'

/**
 * AG-UI forwardedProps 中可透传的字段
 * 客户端通过 forwardedProps 传入这些字段，可覆盖 Agent 中的默认值
 */
interface ForwardedProps {
  /** 用户消息，覆盖从 messages 中提取的最后一条消息 */
  msg?: string
  /** 文件列表 */
  files?: string[]
  /** 是否启用联网搜索 */
  searchEnable?: boolean
  /** 是否使用 SSE 模式 */
  needSSE?: boolean
  /** 聊天历史，覆盖从 messages 中提取的历史 */
  history?: ChatHistoryItem[]
}

/**
 * 解析 Bot ID
 */
function parseBotId(url?: string): string {
  if (!url) return 'default-bot'
  
  // 尝试从 URL 中解析 botId
  // 格式: /v1/aibot/bots/:botId/...
  const match = url.match(/\/bots\/([^/]+)/)
  if (match) {
    return match[1]
  }
  
  return 'default-bot'
}

/**
 * Cloudbase Agent
 * 实现 AG-UI 协议的 Agent
 */
export class CloudbaseAgent extends AbstractAgent {
  private botContext: BotContext
  private mainChatService: MainChatService
  private config: IBotConfig

  constructor(context: CloudbaseContext, config?: IBotConfig) {
    super()
    
    // 处理配置 - 替换 envId 和 README
    const rawConfig = config || botConfig
    this.config = {
      ...rawConfig,
      baseURL: replaceEnvId(rawConfig.baseURL),
      agentSetting: replaceReadMe(rawConfig.agentSetting)
    }
    
    // 创建 BotContext
    this.botContext = new BotContext(context)
    this.botContext.config = this.config
    this.botContext.info = new BotInfo(
      parseBotId(context.httpContext?.url),
      this.config
    )

    // 初始化服务
    this.mainChatService = new MainChatService(this.botContext)
  }

  /**
   * 运行 Agent
   * 实现 AG-UI 协议的流式响应
   */
  run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable((subscriber) => {
      this.runAsync(input, subscriber as any)
        .catch((error) => {
          console.error('CloudbaseAgent run error:', error)
          subscriber.next({
            type: EventType.RUN_ERROR,
            message: error instanceof Error ? error.message : 'Unknown error'
          } as BaseEvent)
          subscriber.complete()
        })
    })
  }

  /**
   * 异步执行对话
   */
  private async runAsync(
    input: RunAgentInput,
    subscriber: any
  ): Promise<void> {
    // 根据中间件注入的 __request_context__ 动态刷新上下文，确保 userId 等信息一致
    try {
      const state = (input as any)?.state as Record<string, unknown> | undefined
      if (state) {
        const requestContext = getRequestContext(state)
        if (requestContext) {
          const newContext = createCloudbaseContext(requestContext)
          this.botContext.context = newContext
        }
      }
    } catch (e) {
      // 上下文刷新失败不应阻断对话流程，仅记录日志
      console.log('update CloudbaseContext from state failed:', e)
    }

    const { messages, threadId, runId } = input
    if (!messages || messages.length === 0) {
      subscriber.next({
        type: EventType.RUN_ERROR,
        message: 'messages must contain at least one item'
      } as BaseEvent)
      return
    }

    // 从 forwardedProps 中提取可透传的字段
    const forwardedProps = (input.forwardedProps ?? {}) as ForwardedProps

    try {
      // 发送 RUN_STARTED 事件
      subscriber.next({
        type: EventType.RUN_STARTED,
        runId,
        threadId
      } as BaseEvent)

      // 提取最后一条用户消息，forwardedProps.msg 可覆盖
      const lastMessage = messages[messages.length - 1]
      const userMessage = forwardedProps.msg ?? this.extractMessageContent(lastMessage)

      // 准备历史消息，forwardedProps.history 可覆盖
      const history: ChatHistoryItem[] = forwardedProps.history ?? messages
        .slice(0, -1)
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: this.extractMessageContent(msg)
        }))

      // 从 forwardedProps 中提取其他可覆盖字段
      const files = forwardedProps.files ?? []
      const searchEnable = forwardedProps.searchEnable ?? this.botContext.info.searchNetworkEnable
      const needSSE = forwardedProps.needSSE ?? false

      // 创建 LLM 通信器
      const llmCommunicator = new LLMCommunicator(this.botContext, {
        ...this.config,
        mcpEnable: true
      })

      // 准备消息上下文
      const chatContextService = this.mainChatService.chatContextService
      const { messages: preparedMessages } = await chatContextService.prepareMessages({
        msg: userMessage,
        history,
        files,
        searchEnable,
        needSSE
      })

      // 创建记录
      const { replyRecordId, conversationId } = await this.mainChatService.beforeStream({
        msg: userMessage,
        files,
        conversationId: threadId || ''
      })

      // 流式调用 LLM - 直接透传所有 AG-UI 事件
      let fullContent = ''
      let hasError = false
      for await (const event of llmCommunicator.streamEvents({
        messages: preparedMessages as any,
        recordId: replyRecordId
      })) {
        // 拦截 RUN_ERROR 以终止流
        if (event.type === EventType.RUN_ERROR) {
          console.error('CloudbaseAgent runAsync LLM error:', (event as any).message)
          subscriber.next(event)
          hasError = true
          break
        }

        // 累积文本内容（用于保存到数据库）
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          fullContent += (event as any).delta || ''
        }

        // 直接透传所有 AG-UI 事件给前端
        subscriber.next(event)
      }

      // 如果已发生错误，跳过后续事件
      if (hasError) {
        return
      }

      // 保存对话记录
      await this.mainChatService.afterStream({
        needSave: true,
        recordId: replyRecordId,
        conversationId,
        userMessage,
        chunks: fullContent
      })

      // 发送 RUN_FINISHED 事件
      subscriber.next({
        type: EventType.RUN_FINISHED
      } as BaseEvent)

    } catch (error) {
      console.error('CloudbaseAgent runAsync error:', error)
      subscriber.next({
        type: EventType.RUN_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error'
      } as BaseEvent)
    } finally {
      subscriber.complete()
    }
  }

  /**
   * 提取消息内容
   */
  private extractMessageContent(message: Message): string {
    if (typeof message.content === 'string') {
      return message.content
    }
    
    if (Array.isArray(message.content)) {
      return message.content
        .map((part) => {
          if (typeof part === 'string') return part
          if (part.type === 'text') return (part as { type: 'text'; text?: string }).text || ''
          return ''
        })
        .join('')
    }
    
    return ''
  }
}

/**
 * Agent 创建工厂函数
 * 用于 createExpressRoutes
 */
export function createAgent({ request }: { request: Request }) {
  // 默认使用匿名用户，实际用户信息由 DetectCloudbaseUserMiddleware 注入到 state 中
  const requestContext = {
    user: { id: 'anonymous', jwt: {} },
    request
  }

  // 创建上下文
  const context = createCloudbaseContext(requestContext)

  // 创建 Agent
  const agent = new CloudbaseAgent(context)

  return { agent }
}

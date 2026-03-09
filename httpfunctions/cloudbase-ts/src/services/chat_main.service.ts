import { BotContext } from '../types/bot_context.js'
import { ChatContextService } from './chat_context.service.js'
import { ChatHistoryService } from './chat_history.service.js'
import {
  BOT_ROLE_ASSISTANT,
  BOT_ROLE_USER,
  BOT_TYPE_TEXT,
  TRIGGER_SRC_TCB
} from '../utils/constants.js'
import { LLMCommunicator, ChatCompletionMessage } from '../llm/llm_communicator.js'
import { getEnvId } from '../config/env.js'
import { ChatHistoryItem, SSESender } from '../types/context.js'
import { FileInfo, ChatHistoryEntity } from '../types/entities.js'
import { getFileInfo } from '../utils/tcb.js'
import { ConversationRelationService } from './conversation_relation.service.js'
import { BaseEvent, EventType } from '@ag-ui/client'

export interface ChatOptions {
  botId: string
  msg: string
  history: ChatHistoryItem[]
  files: string[]
  searchEnable: boolean
  conversationId?: string
}

export type { SSESender }

export class MainChatService {
  botContext: BotContext
  chatContextService: ChatContextService
  chatHistoryService: ChatHistoryService
  conversationRelationService: ConversationRelationService
  private sseSender?: SSESender

  constructor(botContext: BotContext, sseSender?: SSESender) {
    this.botContext = botContext
    this.sseSender = sseSender
    this.chatContextService = new ChatContextService(botContext)
    this.chatHistoryService = new ChatHistoryService(botContext)
    this.conversationRelationService = new ConversationRelationService(botContext)
  }

  async beforeStream({
    msg,
    files,
    conversationId
  }: {
    msg: string
    files: string[]
    conversationId: string
  }): Promise<{ replyRecordId: string; conversationId: string }> {
    try {
      const userId =
        this.botContext.context?.extendedContext?.userId ||
        getEnvId()
      const conversation: string = conversationId || userId
      const baseMsgData = {
        sender: userId,
        type: this.botContext.info?.type ?? BOT_TYPE_TEXT,
        triggerSrc: TRIGGER_SRC_TCB,
        botId: this.botContext.info.botId,
        recommendQuestions: [],
        asyncReply: '',
        image: '',
        conversation
      }
      const replyRecordId = await this.chatHistoryService.genRecordId()

      // 获取文件信息
      const originFileInfos: FileInfo[] = await getFileInfo(files)

      const originMsg = { fileInfos: originFileInfos }
      // 统一接收消息体
      const msgData: ChatHistoryEntity = {
        ...new ChatHistoryEntity(),
        ...baseMsgData,
        recordId: await this.chatHistoryService.genRecordId(),
        role: BOT_ROLE_USER,
        content: msg,
        originMsg: JSON.stringify(originMsg),
        reply: replyRecordId
      }

      // 统一的回复消息体
      const replyMsgData: ChatHistoryEntity = {
        ...new ChatHistoryEntity(),
        ...baseMsgData,
        recordId: replyRecordId,
        role: BOT_ROLE_ASSISTANT,
        content: '',
        originMsg: JSON.stringify({}),
        reply: replyRecordId,
        needAsyncReply: false
      }

      // 添加到数据库
      await this.chatHistoryService.createChatHistory({
        chatHistoryEntity: msgData
      })

      await this.chatHistoryService.createChatHistory({
        chatHistoryEntity: replyMsgData
      })

      return { replyRecordId, conversationId: conversation }
    } catch (error) {
      console.log('beforeStream err:', error)
      return { replyRecordId: '', conversationId: '' }
    }
  }

  async afterStream({
    error,
    needSave,
    callMsg,
    chunks,
    recordId = '',
    conversationId = '',
    userMessage = ''
  }: {
    error?: unknown
    needSave: boolean
    callMsg?: unknown
    chunks: string
    recordId?: string
    conversationId?: string
    userMessage?: string
  }) {
    if (error) {
      console.log('请求大模型错误:', error)
    }
    if (needSave && recordId !== '') {
      const newChatEntity = new ChatHistoryEntity()
      newChatEntity.originMsg = JSON.stringify({ aiResHistory: callMsg })
      newChatEntity.content = chunks
      const updateResult = await this.chatHistoryService.updateChatHistoryByRecordId({
        recordId: recordId,
        chatHistoryEntity: newChatEntity
      })
      if (!updateResult) {
        console.log('更新聊天记录失败：数据库更新失败', {
          recordId
        })
      }
    }

    if (conversationId) {
      try {
        await this.conversationRelationService.setConversationsTitle({
          conversationId,
          userMessage
        })
      } catch (titleError) {
        console.log('setConversationsTitle err:', titleError)
      }
    }
  }

  async chat(options: ChatOptions) {
    // 根据系统配置及请求参数构造对话上下文
    const { messages } = await this.chatContextService.prepareMessages({
      msg: options.msg,
      files: options.files,
      history: options.history,
      searchEnable:
        options.searchEnable && this.botContext.info.searchNetworkEnable,
      triggerSrc: TRIGGER_SRC_TCB,
      needSSE: true
    })

    const { replyRecordId, conversationId } = await this.beforeStream({
      msg: options.msg,
      files: options.files,
      conversationId: options.conversationId || ''
    })

    const llmCommunicator = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      mcpEnable: true
    })

    // 设置 SSE 发送器
    if (this.sseSender) {
      llmCommunicator.setSSESender(this.sseSender)
    }

    console.log('messages:', messages)

    // 发起流式对话
    const result = await llmCommunicator.stream({
      messages: messages as unknown as ChatCompletionMessage[],
      recordId: replyRecordId
    })

    await this.afterStream({
      needSave: true,
      recordId: replyRecordId,
      conversationId,
      userMessage: options.msg,
      ...result
    })

    return result
  }

  /**
   * 流式对话 - 返回 AsyncGenerator 用于 AG-UI
   * 直接透传 AG-UI 事件，不做任何翻译
   */
  async *chatStream(options: ChatOptions): AsyncGenerator<BaseEvent> {
    // 根据系统配置及请求参数构造对话上下文
    const { messages } = await this.chatContextService.prepareMessages({
      msg: options.msg,
      files: options.files,
      history: options.history,
      searchEnable:
        options.searchEnable && this.botContext.info.searchNetworkEnable,
      triggerSrc: TRIGGER_SRC_TCB,
      needSSE: false // 不需要 SSE，使用 AsyncGenerator
    })

    const { replyRecordId, conversationId } = await this.beforeStream({
      msg: options.msg,
      files: options.files,
      conversationId: options.conversationId || ''
    })

    const llmCommunicator = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      mcpEnable: true
    })

    let fullContent = ''
    let error: unknown = null

    try {
      // 直接透传 AG-UI 事件
      for await (const event of llmCommunicator.streamEvents({
        messages: messages as unknown as ChatCompletionMessage[],
        recordId: replyRecordId
      })) {
        // 累积文本内容（用于保存到数据库）
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          fullContent += (event as any).delta || ''
        }

        // 拦截 RUN_ERROR 记录错误
        if (event.type === EventType.RUN_ERROR) {
          error = (event as any).message
        }

        yield event
      }
    } catch (e) {
      error = e
      yield {
        type: EventType.RUN_ERROR,
        message: e instanceof Error ? e.message : 'Unknown error'
      } as BaseEvent
    }

    await this.afterStream({
      needSave: true,
      recordId: replyRecordId,
      conversationId,
      userMessage: options.msg,
      chunks: fullContent,
      error
    })
  }
}

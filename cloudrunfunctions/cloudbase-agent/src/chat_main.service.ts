import { ChatHistoryItem } from '@cloudbase/aiagent-framework'

import { BotContext } from './bot_context'
import { ChatContextService } from './chat_context.service'
import { ChatHistoryEntity, ChatHistoryService } from './chat_history.service'
import {
  BOT_ROLE_ASSISTANT,
  BOT_ROLE_USER,
  BOT_TYPE_TEXT,
  TRIGGER_SRC_TCB
} from './constant'
import { LLMCommunicator } from './llm'
import { getEnvId, getFileInfo } from './tcb'

export interface ChatOptions {
  botId: string;
  msg: string;
  history: ChatHistoryItem[];
  files: string[];
  searchEnable: boolean;
  conversationId?: string;
}

export class MainChatService {
  botContext: BotContext
  chatContextService: ChatContextService
  chatHistoryService: ChatHistoryService

  constructor (botContext?: BotContext) {
    this.botContext = botContext
    this.chatContextService = new ChatContextService(botContext)
    this.chatHistoryService = new ChatHistoryService(botContext)
  }

  async beforeStream ({
    msg,
    files,
    conversationId
  }: {
    msg: string;
    files: string[];
    conversationId: string;
  }): Promise<{ replyRecordId: string }> {
    try {
      const userId =
        this.botContext.context?.extendedContext?.userId ||
        getEnvId(this.botContext.context)
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

      const originFileInfos = await getFileInfo(this.botContext.bot.tcb, files)

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

      return { replyRecordId }
    } catch (error) {
      console.log('beforeStream err:', error)
    }
  }

  async afterStream ({ error, needSave, callMsg, chunks, recordId = '' }) {
    if (error) {
      console.log('请求大模型错误:', error)
    }
    if (needSave && recordId !== '') {
      const newChatEntity = new ChatHistoryEntity()
      newChatEntity.originMsg = JSON.stringify({ aiResHistory: callMsg })
      newChatEntity.content = chunks
      await this.chatHistoryService.updateChatHistoryByRecordId({
        recordId: recordId,
        chatHistoryEntity: newChatEntity
      })
    }
  }

  async chat (options: ChatOptions) {
    // 根据系统配置及请求参数构造对话上下文

    const { messages } = await this.chatContextService.prepareMessages({
      msg: options.msg,
      files: options.files,
      history: options.history,
      searchEnable:
        options.searchEnable && this.botContext.info.searchNetworkEnable,
      triggerSrc: TRIGGER_SRC_TCB
    })
    const { replyRecordId } = await this.beforeStream({
      msg: options.msg,
      files: options.files,
      conversationId: options.conversationId
    })

    const llmCommunicator = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      mcpEnable: true
    })

    console.log('messages:', messages)

    // 发起流式对话
    const result = await llmCommunicator.stream({
      messages,
      recordId: replyRecordId
    })

    await this.afterStream({
      needSave: true,
      recordId: replyRecordId,
      ...result
    })
  }
}

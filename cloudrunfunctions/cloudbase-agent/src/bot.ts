import 'dotenv/config'

import {
  BotCore,
  CreateConversationOutput,
  DeleteConversationInput,
  DeleteConversationOutput,
  GetBotInfoOutput,
  GetChatRecordInput,
  GetChatRecordOutput,
  GetConversationInput,
  GetConversationOutput,
  GetRecommendQuestionsInput,
  GetTextToSpeechResultInput,
  GetTextToSpeechResultOutput,
  IBot,
  SendMessageInput,
  SpeechToTextInput,
  SpeechToTextOutput,
  TextToSpeechInput,
  TextToSpeechOutput,
  UpdateConversationInput,
  UpdateConversationOutput
} from '@cloudbase/aiagent-framework'
import fs from 'fs'

import { botConfig, IBotConfig } from './bot_config'
import { BotContext } from './bot_context'
import { BotInfo } from './bot_info'
import { ChatHistoryService } from './chat_history.service'
import { MainChatService } from './chat_main.service'
import { RecommendQuestionsService } from './chat_recommend_questions.service'
import { ChatToolService } from './chat_tool.service'
import { DEFAULT_CONVERSATION_TITLE } from './constant'
import { ConversationRelationEntity, ConversationRelationService } from './conversation_relation.service'
import { getEnvId, replaceEnvId, replaceReadMe, TcbContext } from './tcb'
import { randomId } from './utils'

export class MyBot extends BotCore implements IBot {
  tcbAgentService: MainChatService
  recommendQuestionsService: RecommendQuestionsService
  chatHistoryService: ChatHistoryService
  chatToolService: ChatToolService
  conversationRelationService: ConversationRelationService

  constructor (context: TcbContext, botConfig: IBotConfig) {
    super(context)
    const botContext = new BotContext(context)
    botContext.bot = this
    botConfig.baseURL = replaceEnvId(context, botConfig.baseURL)
    botConfig.agentSetting = replaceReadMe(botConfig.agentSetting)
    botContext.info = new BotInfo(this.botId, botConfig)
    botContext.config = Object.assign({}, botConfig)

    this.tcbAgentService = new MainChatService(botContext)
    this.chatHistoryService = new ChatHistoryService(botContext)
    this.recommendQuestionsService = new RecommendQuestionsService(botContext)
    this.chatToolService = new ChatToolService(botContext)
    this.conversationRelationService = new ConversationRelationService(botContext)
  }

  async sendMessage (input: SendMessageInput): Promise<void> {
    await this.tcbAgentService.chat({
      botId: this.botId,
      msg: input.msg,
      history: input.history,
      files: input.files,
      searchEnable: input.searchEnable,
      conversationId: input.conversationId
    })

    // 更新会话title
    await this.conversationRelationService.setConversationsTitle({
      conversationId: input.conversationId,
      userMessage: input.msg
    })

    this.sseSender.end()
  }

  async getRecommendQuestions ({
    msg,
    history
  }: GetRecommendQuestionsInput): Promise<void> {
    await this.recommendQuestionsService.chat({
      msg: msg,
      history: history
    })

    this.sseSender.end()
  }

  async getChatRecords (
    input: GetChatRecordInput
  ): Promise<GetChatRecordOutput> {
    const { sort, pageSize, pageNumber, conversationId } = input

    const userId =
        this.context?.extendedContext?.userId ||
        getEnvId(this.context)

    const conversation = conversationId || userId
    const [history, total] = await this.chatHistoryService.describeChatHistory({
      botId: this.botId,
      sort,
      pageSize,
      pageNumber,
      filterAndOptions: [
        {
          conversation: {
            $eq: conversation
          }
        }
      ]
    })

    return { recordList: history, total: total }
  }

  async getBotInfo (): Promise<GetBotInfoOutput> {
    const filePath = 'bot-config.yaml' // 配置文件路径
    try {
      const fileStats = fs.statSync(filePath)
      console.log()
      const botInfo: GetBotInfoOutput = {
        botId: this.botId,
        name: botConfig.name,
        model: botConfig.model,
        agentSetting: botConfig.agentSetting,
        introduction: botConfig.introduction,
        welcomeMessage: botConfig.welcomeMessage,
        avatar: botConfig.avatar,
        isNeedRecommend: botConfig.isNeedRecommend,
        knowledgeBase: botConfig.knowledgeBase,
        databaseModel: botConfig.databaseModel,
        initQuestions: botConfig.initQuestions,
        searchEnable: botConfig.searchNetworkEnable,
        searchFileEnable: botConfig.searchFileEnable,
        mcpServerList: botConfig.mcpServerList,
        voiceSettings: botConfig.voiceSettings,
        updateTime: Math.floor(fileStats.mtime.getTime() / 1000),
        multiConversationEnable: botConfig.multiConversationEnable
      }
      return botInfo
    } catch (error) {
      console.log('查询 Agent 信息失败:', error)
    }
  }

  async speechToText (input: SpeechToTextInput): Promise<SpeechToTextOutput> {
    const result = await this.chatToolService.speechToText(input)
    return { Result: result.result }
  }

  async textToSpeech (input: TextToSpeechInput): Promise<TextToSpeechOutput> {
    const result = await this.chatToolService.textToSpeech(input)
    return { TaskId: result.taskId }
  }

  async getTextToSpeechResult (
    input: GetTextToSpeechResultInput
  ): Promise<GetTextToSpeechResultOutput> {
    const result = await this.chatToolService.getTextToSpeechResult(input)
    return {
      TaskId: result.taskId,
      Status: result.status,
      StatusStr: result.statusStr,
      ResultUrl: result.resultUrl
    }
  }

  async createConversation (): Promise<CreateConversationOutput> {
    const userId =
        this.context?.extendedContext?.userId ||
        getEnvId(this.context)
    // 统一的回复消息体
    const conversationInfo: ConversationRelationEntity = {
      botId:this.botId,
      userId: userId,
      conversationId:`conversation-${randomId(8)}`,
      title:DEFAULT_CONVERSATION_TITLE
    }

    // 添加到数据库
    await this.conversationRelationService.createConversationRelation({
      conversationRelationEntity: conversationInfo
    })

    return {
      conversationId: conversationInfo.conversationId,
      title: conversationInfo.title
    }
  }

  async getConversation (
    input: GetConversationInput
  ): Promise<GetConversationOutput> {

    if (input.isDefault && input.isDefault === true) {
      return {
        data: [],
        total:0
      }
    }
    const pageSize: number = input.limit || 10
    const pageNumber = Math.floor(input.offset || 0 / pageSize) + 1

    const userId = this.context?.extendedContext?.userId || getEnvId(this.context)
    const [conversationRelationList, total] =
      await this.conversationRelationService.describeConversationRelation({
        botId: this.botId,
        filterAndOptions: [
          {
            user_id: {
              $eq: userId
            }
          }
        ],
        pageSize,
        pageNumber
      })

    const data = []
    conversationRelationList.map((item) => {
      data.push({
        conversationId: item.conversationId,
        title: item.title,
        createTime: new Date(item.createdAt).toISOString(),
        updateTime: new Date(item.updatedAt).toISOString()
      })
    })

    return { data, total }
  }

  async updateConversation (
    input: UpdateConversationInput
  ): Promise<UpdateConversationOutput> {

    if (!input.title || input.title.length === 0) {
      throw new Error('title 不能为空')
    }
    const  { count } = await this.conversationRelationService.updateConversationRelationTitle({
      botId: this.botId,
      conversationId: input.conversationId,
      title: input.title
    })

    return { count }
  }

  async deleteConversation (
    input: DeleteConversationInput
  ): Promise<DeleteConversationOutput> {
    const { count } = await this.conversationRelationService.deleteConversationRelationByID(
      {
        botId: this.botId,
        conversationId: input.conversationId
      }
    )
    return { count }
  }
}

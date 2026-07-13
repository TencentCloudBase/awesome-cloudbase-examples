import {
  WeChatCommonInput,
  WeChatTextInput,
  WeChatVoiceInput,
  WeChatWorkCommonInput,
  WeChatWorkTextInput,
  WeChatWorkVoiceInput
} from '@cloudbase/aiagent-framework'

import { BotContext } from './bot_context'
import { ChatContextService } from './chat_context.service'
import { ChatHistoryEntity, ChatHistoryService } from './chat_history.service'
import {
  BOT_ROLE_ASSISTANT,
  BOT_ROLE_USER,
  BOT_TYPE_TEXT,
  EXCEED_CONCURRENT_REQUEST_LIMIT,
  EXCEED_CONCURRENT_REQUEST_LIMIT_MESSAGE,
  EXCEED_TOKEN_QUOTA_LIMIT,
  EXCEED_TOKEN_QUOTA_LIMIT_MESSAGE,
  MSG_TYPE_TEXT,
  MSG_TYPE_VOICE,
  REQUEST_LLM_ERROR_MESSAGE,
  TRIGGER_SRC_WX_CUSTOM_SERVICE,
  TRIGGER_SRC_WX_MINI_APP,
  TRIGGER_SRC_WX_SERVICE,
  TRIGGER_SRC_WX_SUBSCRIPTION
} from './constant'
import { LLMCommunicator } from './llm'
import { WxApiService } from './wx_api.service'
import { botConfig } from './bot_config'

export interface WxChatOptions {
  botId: string;
  triggerSrc: string;
  wxVerify: boolean;
  callbackData:
    | WeChatTextInput
    | WeChatVoiceInput
    | WeChatWorkTextInput
    | WeChatWorkVoiceInput;
}

export class WxChatService {
  botContext: BotContext
  chatContextService: ChatContextService
  chatHistoryService: ChatHistoryService
  wxApiService: WxApiService

  constructor (botContext?: BotContext) {
    this.botContext = botContext
    this.chatContextService = new ChatContextService(botContext)
    this.chatHistoryService = new ChatHistoryService(botContext)
    this.wxApiService = new WxApiService(botContext)
  }

  async beforeStream (options: WxChatOptions) {
    try {
      const { callbackData, triggerSrc, wxVerify } = options
      const { msgData, replyMsgData } = await this.dealMsgData(options)
      let isEnd = false
      let skipAI = false
      if (![MSG_TYPE_TEXT, MSG_TYPE_VOICE].includes(callbackData.msgType)) {
        skipAI = true
        msgData.content = `无法处理的消息类型:${callbackData.msgType}`
        replyMsgData.content = '抱歉暂时无法处理这个类型的消息'
      }

      // 异步回答，先查数据库 ，如果已经有准备回答的记录了，则直接结束，不调用后续
      const previousReply = await this.getPreviousReply({
        botId: this.botContext.bot.botId,
        conversation: replyMsgData.conversation,
        replyRecordId: replyMsgData.recordId
      })

      console.log('previousReply:', previousReply)
      // 如果异步返回，并且已经有记录了，则直接结束
      if (previousReply && previousReply.needAsyncReply) {
        skipAI = true
        isEnd = true
      }
      // 如果没有记录，则写入数据库
      if (!previousReply) {
        await this.chatHistoryService.createChatHistory({
          chatHistoryEntity: msgData
        })

        await this.chatHistoryService.createChatHistory({
          chatHistoryEntity: replyMsgData
        })

      }

      // 获取文本内容
      const content = await this.getWxChatContent(options)

      // 处理人工回复
      if (botConfig?.manualKeyWord && content === botConfig.manualKeyWord) {
        replyMsgData.content = botConfig?.manualReply || '未配备客服联系方式';
        skipAI = true;
      }

      // 处理未认证订阅号/服务号同步响应的情况
      if (
        [TRIGGER_SRC_WX_SUBSCRIPTION, TRIGGER_SRC_WX_SERVICE].includes(
          triggerSrc
        ) &&
        !wxVerify &&
        !skipAI
      ) {
        const { needSkipAI, replyContent } = await this.handlerUnVerifyChat({
          options,
          content,
          conversation: replyMsgData.conversation,
          previousReply
        })

        skipAI = needSkipAI
        replyMsgData.content = replyContent
      }

      if (!skipAI) {
        // 填充 content, 更新msgData,
        msgData.content = content
        const newChatEntity = new ChatHistoryEntity()
        newChatEntity.content = msgData.content
        await this.chatHistoryService.updateChatHistoryByRecordId({
          recordId: msgData.recordId,
          chatHistoryEntity: newChatEntity
        })
      }
      return { skipAI, isEnd, msgData, replyMsgData }
    } catch (error) {
      console.log('beforeStream err:', error)
    }
  }

  // 从微信原始消息中提取 content
  async getWxChatContent (options: WxChatOptions): Promise<string> {
    const { callbackData, triggerSrc } = options
    const { msgType } = callbackData
    let content = ''
    if (msgType === MSG_TYPE_TEXT) {
      if (
        [
          TRIGGER_SRC_WX_MINI_APP,
          TRIGGER_SRC_WX_SUBSCRIPTION,
          TRIGGER_SRC_WX_SERVICE
        ].includes(triggerSrc)
      ) {
        content = (callbackData as WeChatTextInput).content
      } else if ([TRIGGER_SRC_WX_CUSTOM_SERVICE].includes(triggerSrc)) {
        content = (callbackData as WeChatWorkTextInput).text?.content
      }
    } else if (msgType === MSG_TYPE_VOICE) {
      let mediaId = ''
      if (
        [TRIGGER_SRC_WX_SUBSCRIPTION, TRIGGER_SRC_WX_SERVICE].includes(
          triggerSrc
        )
      ) {
        mediaId = (callbackData as WeChatVoiceInput).mediaId
      } else if ([TRIGGER_SRC_WX_CUSTOM_SERVICE].includes(triggerSrc)) {
        mediaId = (callbackData as WeChatWorkVoiceInput).voice?.mediaId
      }

      const mediaResult = await this.botContext.bot.tools.getWxMediaContent(
        this.botContext.bot.botId,
        triggerSrc,
        mediaId
      )

      content = mediaResult?.content
    }
    return content
  }

  // 处理未认证订阅号/服务号同步响应的情况
  async handlerUnVerifyChat ({ options, content, conversation, previousReply }) {
    let needSkipAI = false
    const { callbackData } = options
    let replyContent = ''
    if (content === '继续') {
      // 查询最近一条非空白的对话记录，'继续' 不会被记录在数据库中
      const latestNoEmptyReply = await this.getPreviousReply({
        botId: this.botContext.bot.botId,
        conversation: conversation,
        filterAndOptions: [
          {
            content: {
              $neq: ''
            }
          }
        ]
      })
      console.log('latestNoEmptyReply:', latestNoEmptyReply)
      needSkipAI = true
      if (!latestNoEmptyReply) {
        // 不存在需要继续的会话
        replyContent = '没有查询到相关回答，请继续提问'
      } else {
        // 判断是否存在 async_reply 且回答时间在五分钟内
        if (
          latestNoEmptyReply?.content &&
          Date.now() - latestNoEmptyReply?.createdAt < 300000
        ) {
          // 存在 async_reply，直接读取 async_reply
          replyContent = latestNoEmptyReply?.content || ''
        } else if (
          !latestNoEmptyReply?.content &&
          Date.now() - latestNoEmptyReply?.createdAt < 300000
        ) {
          replyContent = '还在思考中，请稍后回复 "继续" 来获取回答内容'
        } else {
          replyContent = '没有查询到相关回答，请继续提问'
        }
      }
    } else {
      // 处理微信侧主动重试，微信侧会重试3次
      // 判断消息是否有回复，有的话直接回复，没有的话，还是走继续逻辑
      // 异步回答，先查数据库 ，如果已经有准备回答的记录了，则直接结束，不调用后续
      if (previousReply) {
        needSkipAI = true
        const deltaTime =
          Date.now() - (callbackData as WeChatCommonInput).createTime * 1000
        if (previousReply.content || deltaTime > 11 * 1000) {
          replyContent =
            previousReply.content || '思考中，请稍后回复 "继续" 来获取回答内容'
        } else {
          // 没有回复，则沉睡5s，使得请求超时
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
    }

    return { needSkipAI, replyContent }
  }

  /**
   * 获取之前的回答内容的函数，如果没有找到,则找最近的一条
   * @param param0
   * @returns
   */
  async getPreviousReply ({
    botId,
    conversation,
    replyRecordId,
    filterAndOptions = []
  }: {
    botId: string;
    conversation: string;
    replyRecordId?: string;
    filterAndOptions?: object[];
  }): Promise<ChatHistoryEntity | null> {
    filterAndOptions.push({
      conversation: {
        $eq: conversation
      }
    })
    if (replyRecordId) {
      filterAndOptions.push({
        record_id: {
          $eq: replyRecordId
        }
      })
    }
    const [recordList, count] =
      await this.chatHistoryService.describeChatHistory({
        botId,
        sort: 'desc',
        filterAndOptions: filterAndOptions
      })

    if (count !== 0) {
      return recordList[0]
    }
    return null
  }

  // 提取生成 msgData 和 replayData
  async dealMsgData (options: WxChatOptions) {
    const baseMsgData = {
      type: BOT_TYPE_TEXT,
      triggerSrc: options.triggerSrc,
      botId: this.botContext.bot.botId,
      recommendQuestions: [],
      content: ''
    }

    const { callbackData, triggerSrc, wxVerify } = options
    const msgData: ChatHistoryEntity = {
      ...new ChatHistoryEntity(),
      ...baseMsgData,
      recordId: await this.chatHistoryService.genRecordId(),
      role: BOT_ROLE_USER,
      originMsg: JSON.stringify(callbackData ?? {})
    }

    // 统一的回复消息体
    const replyMsgData: ChatHistoryEntity = {
      ...new ChatHistoryEntity(),
      ...baseMsgData,
      role: BOT_ROLE_ASSISTANT,
      originMsg: JSON.stringify({})
    }

    const info = {
      // 微信公众号/服务号消息类型
      // https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_standard_messages.html
      [TRIGGER_SRC_WX_SUBSCRIPTION]: {
        msgData: {
          ...msgData,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName,
          type: (callbackData as WeChatCommonInput).msgType,
          needAsyncReply: wxVerify, // 认证，结果异步返回
          reply: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          )
        },
        replyMsgData: {
          ...replyMsgData,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName,
          type: 'text',
          needAsyncReply: wxVerify,
          recordId: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          )
        }
      },
      [TRIGGER_SRC_WX_SERVICE]: {
        msgData: {
          ...msgData,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName,
          type: (callbackData as WeChatCommonInput).msgType,
          needAsyncReply: wxVerify, // 认证，结果异步返回
          reply: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          )
        },
        replyMsgData: {
          ...replyMsgData,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName,
          type: 'text',
          needAsyncReply: wxVerify,
          recordId: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          )
        }
      },
      // 微信小程序客服消息
      // https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/customer-message/receive.html
      [TRIGGER_SRC_WX_MINI_APP]: {
        msgData: {
          ...msgData,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName,
          type: (callbackData as WeChatCommonInput).msgType,
          needAsyncReply: true,
          reply: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          )
        },
        replyMsgData: {
          ...replyMsgData,
          type: 'text',
          recordId: String(
            triggerSrc +
              (callbackData as WeChatCommonInput).msgId +
              (callbackData as WeChatCommonInput).createTime
          ),
          needAsyncReply: true,
          sender: (callbackData as WeChatCommonInput).fromUserName,
          conversation: (callbackData as WeChatCommonInput).fromUserName
        }
      },
      /**
       * 微信客服消息类型
       * https://kf.weixin.qq.com/api/doc/path/94745
       */
      [TRIGGER_SRC_WX_CUSTOM_SERVICE]: {
        msgData: {
          ...msgData,
          sender: (callbackData as WeChatWorkCommonInput).externalUserId,
          conversation: (callbackData as WeChatWorkCommonInput).externalUserId,
          type: (callbackData as WeChatWorkCommonInput).msgType,
          needAsyncReply: true,
          reply: String(
            triggerSrc +
              (callbackData as WeChatWorkCommonInput).msgId +
              (callbackData as WeChatWorkCommonInput).sendTime
          )
        },
        replyMsgData: {
          ...replyMsgData,
          recordId: String(
            triggerSrc +
              (callbackData as WeChatWorkCommonInput).msgId +
              (callbackData as WeChatWorkCommonInput).sendTime
          ),
          needAsyncReply: true,
          sender: (callbackData as WeChatWorkCommonInput).externalUserId,
          conversation: (callbackData as WeChatWorkCommonInput).externalUserId
        }
      }
    }[triggerSrc] || { msgData, replyMsgData }

    return {
      msgData: info.msgData,
      replyMsgData: info.replyMsgData
    }
  }

  async chat (options: WxChatOptions) {
    const { callbackData, triggerSrc } = options
    // 根据系统配置及请求参数构造对话上下文
    const { skipAI, isEnd, msgData, replyMsgData } =
      await this.beforeStream(options)

    if (isEnd) {
      return
    }

    if (!skipAI) {
      const content = msgData.content
      const { messages } = await this.chatContextService.prepareMessages({
        msg: content,
        history: [],
        searchEnable: this.botContext.info.searchNetworkEnable,
        triggerSrc: options.triggerSrc,
        needSSE: false
      })

      const llmCommunicator = new LLMCommunicator(this.botContext, {
        ...this.botContext.config,
        mcpEnable: true
      })

      // 发起流式对话
      const result = await llmCommunicator.text({
        messages,
        cb: (generateTextRes) => {
          return {
            choices: [{ message: { content: generateTextRes?.text } }],
            content: generateTextRes?.text,
            reasoning: generateTextRes?.reasoning,
            reasoningDetails: generateTextRes?.reasoningDetails,
            toolCalls: generateTextRes?.toolCalls,
            toolResults: generateTextRes?.toolResults,
            finishReason: generateTextRes?.finishReason,
            usage: generateTextRes?.usage,
            steps: generateTextRes?.steps?.map((v) => ({
              stepType: v.stepType,
              text: v.text,
              reasoning: v.reasoning,
              reasoningDetails: v.reasoningDetails,
              toolCalls: v.toolCalls,
              toolResults: v.toolResults,
              finishReason: v.finishReason,
              usage: v.usage
            }))
          }
        }
      })

      if (result.error) {
        // LLM 调用失败，映射错误码到用户友好消息
        let errMsg = REQUEST_LLM_ERROR_MESSAGE
        if (result.error.code === EXCEED_CONCURRENT_REQUEST_LIMIT) {
          errMsg = EXCEED_CONCURRENT_REQUEST_LIMIT_MESSAGE
        } else if (result.error.code === EXCEED_TOKEN_QUOTA_LIMIT) {
          errMsg = EXCEED_TOKEN_QUOTA_LIMIT_MESSAGE
        }
        replyMsgData.content = errMsg
      } else {
        replyMsgData.content = result.content
      }
    }

    console.log('replyMsgData:', replyMsgData)

    const toWxMsgData = await this.afterStream({
      options,
      needSave: !skipAI,
      replyMsgData
    })

    console.log('toWxMsgData:', toWxMsgData)

    if (replyMsgData.needAsyncReply) {
      this.wxApiService.sendMessageToClient(triggerSrc, {
        msgType: toWxMsgData.msgType,
        touser: toWxMsgData.toUserName,
        text: {
          content: toWxMsgData.content
        },
        openKfId: toWxMsgData.openKfId,
        msgId: callbackData.msgId
      })
      // 异步响应，返回空
      return
    }

    return {
      toUserName: toWxMsgData.toUserName,
      fromUserName: toWxMsgData.fromUserName,
      createTime: Math.floor(Date.now() / 1000),
      msgType: replyMsgData.type,
      content: replyMsgData.content
    }
  }

  async afterStream ({ options, needSave, replyMsgData }) {
    if (needSave && replyMsgData.recordId !== '') {
      const newChatEntity = new ChatHistoryEntity()
      newChatEntity.content = replyMsgData.content
      await this.chatHistoryService.updateChatHistoryByRecordId({
        recordId: replyMsgData.recordId,
        chatHistoryEntity: newChatEntity
      })
    }

    return await this.processReplyMsg(options.callbackData, replyMsgData)
  }

  processReplyMsg (callbackData, replyMsgData: ChatHistoryEntity) {
    console.log('callbackData:', callbackData)
    const triggerSrc = replyMsgData.triggerSrc
    switch (triggerSrc) {
      // 微信公众号
      // https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Receiving_standard_messages.html
      // 微信小程序客服消息
      // https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/customer-message/receive.html
      case TRIGGER_SRC_WX_SUBSCRIPTION:
      case TRIGGER_SRC_WX_SERVICE:
      case TRIGGER_SRC_WX_MINI_APP:
        if (replyMsgData.content) {
          return {
            toUserName: (callbackData as WeChatCommonInput).fromUserName,
            fromUserName: (callbackData as WeChatCommonInput).toUserName,
            msgType: MSG_TYPE_TEXT,
            content: replyMsgData.content || '抱歉暂时无法处理这个类型的消息'
          }
        }
        break
      // 企业微信
      // https://kf.weixin.qq.com/api/doc/path/94744
      case TRIGGER_SRC_WX_CUSTOM_SERVICE:
        if (replyMsgData.content) {
          return {
            toUserName: (callbackData as WeChatWorkCommonInput).externalUserId,
            fromUserName: (callbackData as WeChatWorkCommonInput).openKfId,
            openKfId: (callbackData as WeChatWorkCommonInput).openKfId,
            msgType: MSG_TYPE_TEXT,
            content: replyMsgData.content
          }
        }
        break
      default:
        return
    }
    return
  }
}

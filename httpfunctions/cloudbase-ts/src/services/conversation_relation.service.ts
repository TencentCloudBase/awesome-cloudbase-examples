import { BotContext } from '../types/bot_context.js'
import {
  CONVERSATION_RELATION_DATA_SOURCE,
  DEFAULT_CONVERSATION_TITLE
} from '../utils/constants.js'
import { getApiKey, getOpenAPIBaseURL } from '../config/env.js'
import { safeJsonParse } from '../utils/helpers.js'
import {
  ConversationRelationEntity,
  ConversationRelationData
} from '../types/entities.js'

export class ConversationRelationService {
  botContext: BotContext

  constructor(botContext: BotContext) {
    this.botContext = botContext
  }

  /**
   * 将会话记录保存在数据库中
   */
  async createConversationRelation({
    conversationRelationEntity
  }: {
    conversationRelationEntity: ConversationRelationEntity
  }): Promise<string | null> {
    const token = getApiKey()
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/create`

    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          data: {
            bot_id: conversationRelationEntity.botId,
            user_id: conversationRelationEntity.userId,
            conversation_id: conversationRelationEntity.conversationId,
            title: conversationRelationEntity.title
          }
        })
      })

      await fetchRes.json()

      return conversationRelationEntity.conversationId
    } catch (error) {
      console.log('写入会话记录数据库失败 error:', error)
      return null
    }
  }

  /**
   * 更新会话标题
   */
  async updateConversationRelationTitle({
    botId,
    conversationId,
    title
  }: {
    botId: string
    conversationId: string
    title: string
  }) {
    const token = getApiKey()
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/update`

    try {
      const fetchRes = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: {
            where: {
              $and: [
                {
                  conversation_id: {
                    $eq: conversationId
                  }
                },
                {
                  bot_id: {
                    $eq: botId
                  }
                }
              ]
            }
          },
          data: {
            title: title
          }
        })
      })

      const text = await fetchRes.text()
      const resData = safeJsonParse(text)

      console.log(
        `更新会话标题 url: ${url}, botId: ${botId}, conversationId: ${conversationId}, title:${title}, resData: ${JSON.stringify(resData)}`
      )
      return resData.data
    } catch (error) {
      console.log('更新会话标题失败 error:', error)
    }

    return
  }

  /**
   * 删除会话
   */
  async deleteConversationRelationByID({
    botId,
    conversationId
  }: {
    botId: string
    conversationId: string
  }) {
    const token = getApiKey()
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/delete`

    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: {
            where: {
              $and: [
                {
                  conversation_id: {
                    $eq: conversationId
                  }
                },
                {
                  bot_id: {
                    $eq: botId
                  }
                }
              ]
            }
          }
        })
      })

      const text = await fetchRes.text()
      const resData = safeJsonParse(text)
      return resData?.data
    } catch (error) {
      console.log('删除会话失败 error:', error)
    }

    return
  }

  /**
   * 查询数据库中的会话记录
   */
  async describeConversationRelation({
    botId,
    pageSize = 10,
    pageNumber = 1,
    filterAndOptions = []
  }: {
    botId: string
    pageSize?: number
    pageNumber?: number
    filterAndOptions?: unknown[]
  }): Promise<[ConversationRelationEntity[] | null, number]> {
    const token = getApiKey()
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/list`

    try {
      const fetchRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: {
            where: {
              $and: [
                {
                  bot_id: {
                    $eq: botId
                  }
                },
                ...filterAndOptions
              ]
            }
          },
          select: {
            $master: true
          },
          getCount: true,
          pageSize: pageSize,
          pageNumber: pageNumber
        })
      })

      interface FetchResponse {
        code?: number
        message?: string
        data?: {
          records: ConversationRelationData[]
          total: number
        }
      }

      const resData: FetchResponse = await fetchRes.json()

      if (resData.code) {
        console.error(
          `查询会话数据失败，botId: ${botId}, pageSize: ${pageSize}, pageNumber: ${pageNumber}, resData: ${JSON.stringify(
            resData
          )}`
        )
        return [[], 0]
      }

      const records = resData?.data?.records
      const total = resData?.data?.total

      const entityList: ConversationRelationEntity[] = []
      records?.forEach((item) => {
        entityList.push(this.transDataToChatEntity(item))
      })

      return [entityList, total ?? 0]
    } catch (error) {
      console.log('查询会话数据数据失败 error:', error)
      return [[], 0]
    }
  }

  /**
   * 设置会话标题（基于用户消息自动生成）
   */
  async setConversationsTitle({
    conversationId,
    userMessage
  }: {
    conversationId: string
    userMessage?: string
  }) {
    if (!conversationId) {
      return
    }

    // 如果不是默认title，则更新
    const [conversationList] = await this.describeConversationRelation({
      botId: this.botContext.info.botId,
      filterAndOptions: [
        {
          conversation_id: {
            $eq: conversationId
          }
        }
      ]
    })

    if (
      conversationList &&
      conversationList.length !== 0 &&
      conversationList[0].title !== DEFAULT_CONVERSATION_TITLE
    ) {
      return
    }

    // 使用用户消息生成标题：压缩空白并限制长度，空值回退默认标题
    const normalizedUserMessage = (userMessage || '').replace(/\s+/g, ' ').trim()
    const title = normalizedUserMessage
      ? normalizedUserMessage.slice(0, 100)
      : DEFAULT_CONVERSATION_TITLE

    await this.updateConversationRelationTitle({
      botId: this.botContext.info.botId,
      conversationId: conversationId,
      title: title
    })
  }

  /**
   * 查询到的数据转换为Entity结构
   */
  transDataToChatEntity(
    item: ConversationRelationData
  ): ConversationRelationEntity {
    if (!item) {
      return new ConversationRelationEntity()
    }
    const conversationEntity: ConversationRelationEntity =
      new ConversationRelationEntity()
    conversationEntity.botId = item.bot_id
    conversationEntity.userId = item.user_id
    conversationEntity.conversationId = item.conversation_id
    conversationEntity.title = item.title
    conversationEntity.createdAt = item.createdAt
    conversationEntity.updatedAt = item.updatedAt
    return conversationEntity
  }
}

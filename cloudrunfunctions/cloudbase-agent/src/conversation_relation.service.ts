import { BotContext } from './bot_context'
import { CONVERSATION_RELATION_DATA_SOURCE, DEFAULT_CONVERSATION_TITLE } from './constant'
import { getAccessToken, getOpenAPIBaseURL } from './tcb'
import { safeJsonParse } from './utils'

export class ConversationRelationService {
  botContext: BotContext

  constructor (botContext: BotContext) {
    this.botContext = botContext
  }

  // 将会话记录保存在数据库中
  async createConversationRelation ({
    conversationRelationEntity
  }: {
    conversationRelationEntity: ConversationRelationEntity;
  }): Promise<string | null> {
    const token = getAccessToken(this.botContext.context)
    const url = `${getOpenAPIBaseURL(
      this.botContext.context
    )}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/create`

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
    }
  }

  async updateConversationRelationTitle ({
    botId,
    conversationId,
    title
  }: {
    botId: string;
    conversationId: string;
    title: string;
  }) {
    const token = getAccessToken(this.botContext.context)
    const url = `${getOpenAPIBaseURL(
      this.botContext.context
    )}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/update`

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

  async deleteConversationRelationByID ({
    botId,
    conversationId
  }: {
    botId: string;
    conversationId: string;
  }) {
    const token = getAccessToken(this.botContext.context)
    const url = `${getOpenAPIBaseURL(
      this.botContext.context
    )}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/delete`

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
      return resData.data
    } catch (error) {
      console.log('删除会话失败 error:', error)
    }

    return
  }

  // 查询数据库中的聊天记录
  async describeConversationRelation ({
    botId,
    pageSize = 10,
    pageNumber = 1,
    filterAndOptions = []
  }: {
    botId: string;
    pageSize?: number;
    pageNumber?: number;
    filterAndOptions?: unknown[];
  }): Promise<[ConversationRelationEntity[] | null, number]> {
    const token = getAccessToken(this.botContext.context)
    const url = `${getOpenAPIBaseURL(
      this.botContext.context
    )}/v1/model/prod/${CONVERSATION_RELATION_DATA_SOURCE}/list`

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
        code?: number;
        message?: string;
        data?: {
          records: ConversationRelationData[];
          total: number;
        };
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
      records.forEach((item) => {
        entityList.push(this.transDataToChatEntity(item))
      })

      return [entityList, total]
    } catch (error) {
      console.log('查询会话数据数据失败 error:', error)
    }
  }

  async setConversationsTitle ({
    conversationId,
    userMessage
  }: {
    conversationId: string;
    userMessage?: string;

  }) {

    if (!conversationId) {
      return
    }

    // 如果不是默认title，则更新
    const [conversationList] = await this.describeConversationRelation({
      botId: this.botContext.bot.botId,
      filterAndOptions: [
        {
          conversation_id: {
            $eq: conversationId
          }
        }
      ]
    })

    if (conversationList && conversationList.length !== 0 && conversationList[0].title !== DEFAULT_CONVERSATION_TITLE) {
      return
    }

    const QUESTION_PROMPT = `假设你是一个写做高手，帮我把下面这些信息，总结提炼出一个不超过十个字的标题，如果无法提炼，请直接回答：无法提炼，信息如下：${userMessage}`

    const result = await this.botContext.bot.tools.searchNetwork(
      this.botContext.info.botId,
      QUESTION_PROMPT
    )

    console.log('setConversationsTitle result:', result)
    const aiTitle =
      !result.content || result.content.length === 0
        ? '无法提炼'
        : result.content
    console.log('setConversationsTitle aiTitle:', aiTitle)
    const title = aiTitle.includes('无法提炼') || aiTitle ? userMessage : aiTitle
    console.log('setConversationsTitle title:', title)

    await this.updateConversationRelationTitle({
      botId: this.botContext.info.botId,
      conversationId: conversationId,
      title: title?.slice(0, 100)
    })
  }

  // 查询到的数据转换为Entity结构
  transDataToChatEntity (
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

export interface ConversationRelationData {
  bot_id: string;
  user_id: string;
  conversation_id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export class ConversationRelationEntity {
  botId: string
  userId: string
  conversationId:string
  title:string
  createdAt?: number
  updatedAt?: number
}

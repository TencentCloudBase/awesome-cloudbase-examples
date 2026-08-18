import { BotContext } from "../types/bot_context.js";
import {
  BOT_ROLE_USER,
  CHAT_HISTORY_DATA_SOURCE,
  HISTORY_PAGE_SIZE,
} from "../utils/constants.js";
import { getApiKey, getOpenAPIBaseURL } from "../config/env.js";
import { genRandomStr, safeJsonParse } from "../utils/helpers.js";
import { ChatHistoryEntity, ChatHistoryData } from "../types/entities.js";

export class ChatHistoryService {
  botContext: BotContext;

  constructor(botContext: BotContext) {
    this.botContext = botContext;
  }

  async genRecordId(): Promise<string> {
    return "record-" + genRandomStr(8);
  }

  // 将聊天记录保存在数据库中
  async createChatHistory({
    chatHistoryEntity,
  }: {
    chatHistoryEntity: ChatHistoryEntity;
  }): Promise<string | null> {
    const token = getApiKey();
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CHAT_HISTORY_DATA_SOURCE}/create`;

    try {
      const fetchRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            record_id: chatHistoryEntity.recordId,
            bot_id: chatHistoryEntity.botId,
            role: chatHistoryEntity.role,
            content: chatHistoryEntity.content,
            sender: chatHistoryEntity.sender,
            conversation: chatHistoryEntity.conversation,
            type: chatHistoryEntity.type,
            image: chatHistoryEntity.image,
            trigger_src: chatHistoryEntity.triggerSrc,
            origin_msg: chatHistoryEntity.originMsg,
            reply_to: chatHistoryEntity.replyTo,
            reply: chatHistoryEntity.reply,
            trace_id: chatHistoryEntity.traceId,
            need_async_reply: chatHistoryEntity.needAsyncReply,
            async_reply: chatHistoryEntity.asyncReply,
          },
        }),
      });

      const resData = await fetchRes.json();

      console.log(
        `写入数据 url: ${url}, chatHistoryEntity:${JSON.stringify(
          chatHistoryEntity,
        )}, resData: ${JSON.stringify(resData)}`,
      );
      return chatHistoryEntity.recordId;
    } catch (error) {
      console.log("写入数据库失败 error:", error);
    }
    return null;
  }

  // 更新聊天记录信息
  async updateChatHistoryByRecordId({
    recordId,
    chatHistoryEntity,
  }: {
    recordId: string;
    chatHistoryEntity: ChatHistoryEntity;
  }) {
    const token = getApiKey();
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CHAT_HISTORY_DATA_SOURCE}/update`;

    try {
      const fetchRes = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filter: {
            where: {
              $and: [
                {
                  record_id: {
                    $eq: recordId,
                  },
                },
              ],
            },
          },
          data: {
            content: chatHistoryEntity.content,
            image: chatHistoryEntity.image,
            async_reply: chatHistoryEntity.asyncReply,
            recommend_questions: chatHistoryEntity.recommendQuestions,
            status: chatHistoryEntity.status,
            origin_msg: chatHistoryEntity.originMsg,
          },
        }),
      });

      const text = await fetchRes.text();
      const resData = safeJsonParse(text);

      console.log(
        `更新数据 url: ${url}, recordId: ${recordId}, chatHistoryEntity:${JSON.stringify(
          chatHistoryEntity,
        )}, resData: ${JSON.stringify(resData)}`,
      );
      return recordId;
    } catch (error) {
      console.log("更新数据失败 error:", error);
    }
  }

  // 查询数据库中的聊天记录
  async describeChatHistory({
    botId,
    sort,
    pageSize = 10,
    pageNumber = 1,
    filterAndOptions = [],
  }: {
    botId: string;
    sort: string;
    pageSize?: number;
    pageNumber?: number;
    filterAndOptions?: unknown[];
  }): Promise<[ChatHistoryEntity[] | null, number]> {
    const token = getApiKey();
    const url = `${getOpenAPIBaseURL()}/v1/model/prod/${CHAT_HISTORY_DATA_SOURCE}/list`;

    if (!sort || sort.length === 0) {
      sort = "desc";
    }

    try {
      const fetchRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filter: {
            where: {
              $and: [
                {
                  bot_id: {
                    $eq: botId,
                  },
                },
                ...filterAndOptions,
              ],
            },
          },
          select: {
            $master: true,
          },
          orderBy: [
            {
              createdAt: sort,
            },
          ],
          getCount: true,
          pageSize: pageSize,
          pageNumber: pageNumber,
        }),
      });

      interface FetchResponse {
        code?: number;
        message?: string;
        data?: {
          records: ChatHistoryData[];
          total: number;
        };
      }

      const resData: FetchResponse = await fetchRes.json();

      if (resData.code) {
        console.error(
          `查询对话历史数据失败，botId: ${botId}, sort: ${sort}, pageSize: ${pageSize}, pageNumber: ${pageNumber}, resData: ${JSON.stringify(
            resData,
          )}`,
        );
        return [[], 0];
      }

      const records = resData?.data?.records;
      const total = resData?.data?.total;

      const entityList: ChatHistoryEntity[] = [];
      records?.forEach((item) => {
        entityList.push(this.transDataToChatEntity(item));
      });

      return [entityList, total ?? 0];
    } catch (error) {
      console.log("查询数据数据失败 error:", error);
    }
    return [[], 0];
  }

  // 查询到的数据转换为Entity结构
  transDataToChatEntity(item: ChatHistoryData): ChatHistoryEntity {
    if (!item) {
      return new ChatHistoryEntity();
    }
    const chatEntity: ChatHistoryEntity = new ChatHistoryEntity();
    chatEntity.botId = item.bot_id;
    chatEntity.recordId = item.record_id;
    chatEntity.role = item.role;
    chatEntity.status = item.status;
    chatEntity.content = item.content;
    chatEntity.sender = item.sender;
    chatEntity.conversation = item.conversation;
    chatEntity.type = item.type;
    chatEntity.triggerSrc = item.trigger_src;
    chatEntity.originMsg = item.origin_msg;
    chatEntity.replyTo = item.reply_to;
    chatEntity.reply = item.reply;
    chatEntity.traceId = item.trace_id;
    chatEntity.needAsyncReply = item.need_async_reply;
    chatEntity.asyncReply = item.async_reply;
    chatEntity.createdAt = item.createdAt;
    chatEntity.updatedAt = item.updatedAt;
    return chatEntity;
  }

  // 大模型查询历史记录，只获取最近的10组对话，也就是20条数据，太多的历史数据会被模型扔掉
  async queryForLLM(
    botId: string,
    startCreatedAt?: number,
    triggerSrc?: string,
  ): Promise<ChatHistoryEntity[]> {
    if (startCreatedAt === undefined) {
      startCreatedAt = Date.now() - 24 * 60 * 60 * 1000;
    }
    const recordEntityList: ChatHistoryEntity[] = [];
    const pageSize = HISTORY_PAGE_SIZE;

    const filterAndOptions = [];

    if (startCreatedAt !== undefined) {
      filterAndOptions.push({
        createdAt: {
          $gt: startCreatedAt,
        },
      });
    }

    if (triggerSrc && triggerSrc !== "") {
      filterAndOptions.push({
        trigger_src: {
          $eq: triggerSrc,
        },
      });
    }

    const [recordList] = await this.describeChatHistory({
      botId,
      sort: "desc",
      pageSize,
      filterAndOptions: filterAndOptions,
    });
    recordEntityList.push(...(recordList || []).reverse());

    const entityMap = new Map();
    recordEntityList
      .filter((item) => {
        if (item.needAsyncReply === true) {
          return !!item.asyncReply;
        } else {
          return !!item.content;
        }
      })
      .forEach((item) => {
        entityMap.set(item.recordId, item);
      });

    const result: ChatHistoryEntity[] = [];
    /*
    1. 强依赖于数据库历史数据,模型历史数据对role的顺序有要求
    2. 需要做到无论遇到怎么样的bug，总能获得一组完整的，可用的user + assistant，否则请求会失败
    */
    recordEntityList.forEach((item) => {
      const { role, content, reply } = item;
      // 调用大模型时，content为空会导致调用失败，因此需要过滤掉 content 为空的异常对话
      if (role === BOT_ROLE_USER && content?.length !== 0) {
        if (entityMap.has(reply)) {
          const replyItem = entityMap.get(reply);
          result.push({
            role,
            content,
          } as ChatHistoryEntity);
          result.push({
            role: replyItem?.role || "assistant",
            content: replyItem?.content || "",
          } as ChatHistoryEntity);
        }
      }
    });
    if (result.length % 2 === 1) {
      result.splice(-1, 1);
    }
    return result;
  }
}

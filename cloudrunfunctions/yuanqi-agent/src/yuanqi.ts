import {
  BotCoreSseSender,
  TcbContext,
} from "@cloudbase/aiagent-framework/dist/types";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";

const DEFAULT_YUAN_QI_HOST = "https://yuanqi.tencent.com/openapi/v1/agent/";

export class YuanQi {
  context: TcbContext;
  agentID: string;
  apiKey: string;
  yuanQiAgent: OpenAI;

  constructor(context: TcbContext, agentID: string, apiKey: string) {
    this.context = context;
    this.agentID = agentID;
    this.apiKey = apiKey;

    this.yuanQiAgent = new OpenAI({
      apiKey: apiKey,
      baseURL: DEFAULT_YUAN_QI_HOST,
      defaultHeaders: {
        "X-Source": "openapi",
      },
    });
  }

  /**
   * 获取对话句柄
   * @param msg 消息内容
   * @returns 对话句柄
   */
  async createChatCompletion(msg: string) {
    let userId = this.context.extendedContext?.userId;
    if (userId) {
      console.log("Using `extendedContext.userId` as `session_id`");
    } else {
      console.log("Using `randomUUID()` as `session_id`");
      userId = randomUUID();
    }

    // 构造消息内容
    const messages: YuanQiMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: msg,
          },
        ],
      },
    ];

    // 调用 YuanQi 平台对话接口
    const chatCompletion = await this.yuanQiAgent.chat.completions.create(
      { stream: true, messages: [], model: "" },
      {
        body: {
          user_id: userId,
          assistant_id: this.agentID,
          messages,
          stream: true,
        },
      },
    );
    return chatCompletion;
  }

  /**
   * 处理消息句柄，并将信息以 SSE 形式返回
   * @param chatCompletion 消息句柄
   * @param sseSender SSE 响应处理
   * @returns 消息内容
   */
  async handleCompletion(
    chatCompletion: any,
    sseSender: BotCoreSseSender,
  ): Promise<string> {
    let replyContent = "";

    for await (const chunk of chatCompletion) {
      if (chunk?.choices?.[0]?.delta?.role !== "assistant") {
        continue;
      }
      const content = chunk.choices[0]?.delta?.content || "";
      // 累加到 replyContent 中
      replyContent += content;
      // 发送给客户端
      sseSender.send({
        data: {
          ...chunk,
          content,
          role: "assistant",
          type: "text",
        },
      });
    }
    return replyContent;
  }
}



export const messageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.string().nonempty(),
});

export const yuanQiTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string().nonempty(),
});

export const yuanQiFileContentSchema = z.object({
  type: z.literal("file_url"),
  file_url: z.object({
    type: z.string().nonempty(),
    url: z.string().nonempty(),
  }),
});

export const yuanQiMessageSchema = z.object({
  role: z.union([z.literal("user"), z.literal("assistant")]),
  content: z.array(z.union([yuanQiTextContentSchema, yuanQiFileContentSchema])),
});

type Message = z.infer<typeof messageSchema>;
export type YuanQiMessage = z.infer<typeof yuanQiMessageSchema>;

export function messageToYuanQiMessage(message: Message): YuanQiMessage {
  return {
    role: message.role,
    content: [{ type: "text", text: message.content }],
  };
}



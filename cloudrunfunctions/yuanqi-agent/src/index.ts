import { BotCore, BotRunner, GetRecommendQuestionsInput, IBot, SendMessageInput } from "@cloudbase/aiagent-framework";
import { TcbEventFunction } from "@cloudbase/functions-typings";
import { YuanQi } from "./yuanqi";
import { TcbContext } from "@cloudbase/aiagent-framework/dist/types";


export const YUAN_QI_AGENT_ID = process.env.YUAN_QI_AGENT_ID;
export const YUAN_QI_API_KEY = process.env.YUAN_QI_API_KEY;


export const main: TcbEventFunction<unknown> = function (event, context) {
  // 校验参数
  if (!YUAN_QI_API_KEY) {
    throw new Error("`YUAN_QI_API_KEY` not found");
  }

  // 初始化 YuanQi
  const yuanQiAgent = new YuanQi(
    context,
    YUAN_QI_AGENT_ID as string, YUAN_QI_API_KEY as string,
  );

  // 初始化函数型云开发 Agent 服务
  return BotRunner.run(event, context, new agentWrapper(context, yuanQiAgent));
};


export class agentWrapper extends BotCore implements IBot {
  yuanQiAgent: YuanQi;
  constructor(context: TcbContext, yuanQiAgent: YuanQi) {
    super(context);
    this.yuanQiAgent = yuanQiAgent;
  }

  async sendMessage({ msg }: SendMessageInput): Promise<void> {
    console.log("[sendMessage()] starts");
    // 新建聊天记录，保存在数据模型中
    const { updateBotRecord } = await this.createRecordPair({
      userContent: msg,
    });

    // 构建 YuanQi 对话句柄
    const chatCompletion = await this.yuanQiAgent.createChatCompletion(msg);

    // 处理 YuanQi 对话句柄，获取响应数据
    const replyContent = await this.yuanQiAgent.handleCompletion(
      chatCompletion,
      this.sseSender,
    );
    // 消息传输结束
    this.sseSender.end();
    // 收集到完整的 Agent 消息后，更新数据模型中的消息记录
    await updateBotRecord({ content: replyContent });
  }

  async getRecommendQuestions(
    input: GetRecommendQuestionsInput,
  ): Promise<void> {
    // 构建 YuanQi 推荐问题句柄
    const chatCompletion = await this.yuanQiAgent.createChatCompletion(
      "你会推荐我问你什么问题？给出三个例子。",
    );

    // 处理 YuanQi 对话句柄，获取响应数据
    await this.yuanQiAgent.handleCompletion(chatCompletion, this.sseSender);
    this.sseSender.end();
  }
}

import { BotRunner } from "@cloudbase/aiagent-framework";
import { TcbEventFunction } from "@cloudbase/functions-typings";
import { ADP } from "./adp";
import { BotCore, IBot, SendMessageInput } from "@cloudbase/aiagent-framework";
import { TcbContext } from "@cloudbase/aiagent-framework/dist/types";

// 腾讯云智能体开发平台应用 APP KEY
export const ADP_APP_KEY = process.env.LKE_APP_KEY;

export const main: TcbEventFunction<unknown> = function (event, context) {
  // 校验参数
  if (!ADP_APP_KEY) {
    throw new Error("`ADP_APP_KEY` not found");
  }

  // 初始化 ADP
  const adp = new ADP(context, ADP_APP_KEY as string);

  // 初始化函数型云开发 Agent 服务
  return BotRunner.run(event, context, new agentWrapper(context, adp));
};


export class agentWrapper extends BotCore implements IBot {
  adpAgent: ADP;
  constructor(context: TcbContext, adp: ADP) {
    super(context);
    this.adpAgent = adp;
  }

  async sendMessage({ msg }: SendMessageInput): Promise<void> {
    // 新建聊天记录，保存在数据模型中
    const { updateBotRecord } = await this.createRecordPair({
      userContent: msg,
    });

    // 构建 ADP 对话句柄
    const chatCompletion = await this.adpAgent.createChatCompletion(msg);

    // 处理 ADP 对话句柄，获取响应数据
    const replyContent = await this.adpAgent.handleCompletion(
      chatCompletion,
      this.sseSender,
    );

    // 收集到完整的 Agent 消息后，更新数据模型中的消息记录
    await updateBotRecord({ content: replyContent });
  }
}
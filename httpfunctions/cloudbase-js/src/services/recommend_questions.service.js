"use strict";
import { BOT_ROLE_USER } from "../utils/constants.js";
import { LLMCommunicator } from "../llm/llm_communicator.js";
export class RecommendQuestionsService {
  botContext;
  sseSender;
  constructor(botContext, sseSender) {
    this.botContext = botContext;
    this.sseSender = sseSender;
  }
  /**
   * 设置 SSE 发送器
   */
  setSSESender(sseSender) {
    this.sseSender = sseSender;
  }
  /**
   * 推荐问题的提示词
   */
  async genRecommendQuestionMessages({
    historyChatList = [],
    content = ""
  }) {
    const questionList = this.botContext.info?.initQuestions ?? [];
    let question = "请问有什么需要帮助的嘛?";
    if (questionList?.length !== 0) {
      question = questionList[0];
    }
    historyChatList = [...historyChatList, {
      role: BOT_ROLE_USER,
      content
    }];
    const messages = [
      {
        role: "user",
        content: `根据用户的对话内容，结合历史提问以及智能体介绍和设定，生成接下来用户可能问的3个问题，不要直接回答用户的问题或者其他问题

        历史提问使用 [HISTORY] 和 [END HISTORY]符号包裹 
        [HISTORY]
        ${historyChatList?.filter((item) => {
          return item.role === BOT_ROLE_USER;
        }).map((item) => {
          return item.content;
        }).join("\n")}
        [END HISTORY]

        智能体介绍和设定使用 [AGENT] 和 [END AGENT]符号包裹 
        
        [AGENT]
        介绍: ${this.botContext.info?.introduction},
        设定: ${this.botContext.info?.agentSetting}
        [END AGENT]

        推荐的问题格式是，并且问题中不要有多余的字符
        
        ${question}
        
        问题的分隔用换行符,特别注意问题中不能出现换行符,否则会出现错误
        `
      }
    ];
    return messages;
  }
  /**
   * 生成推荐问题（SSE 流式响应）
   */
  async chat(params) {
    const messages = await this.genRecommendQuestionMessages({
      historyChatList: params.history,
      content: params.msg
    });
    const agent = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      searchEnable: false,
      mcpEnable: false
    });
    if (this.sseSender) {
      agent.setSSESender(this.sseSender);
    }
    await agent.stream({
      messages,
      recordId: "recommend-questions"
    });
  }
}

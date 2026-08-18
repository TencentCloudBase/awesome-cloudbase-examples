import { ChatHistoryItem } from '@cloudbase/aiagent-framework'

import { BotContext } from './bot_context'
import { BOT_ROLE_USER } from './constant'
import { ChatCompletionMessage, LLMCommunicator } from './llm'

export class RecommendQuestionsService {
  botContext: BotContext

  constructor (botContext: BotContext) {
    this.botContext = botContext
  }

  /**
   * 推荐问题的提示词
   */
  private async genRecommendQuestionMessages ({
    historyChatList = [],
    content = ''
  }: {
    historyChatList?: ChatHistoryItem[];
    content?: string;
  }): Promise<ChatCompletionMessage[]> {
    const questionList = JSON.parse(
      this.botContext.info?.initQuestions ?? '[]'
    )

    let question = '请问有什么需要帮助的嘛?'
    if (questionList?.length !== 0) {
      question = questionList[0]
    }

    historyChatList.push({
      role: BOT_ROLE_USER,
      content: content
    })

    const messages = [
      {
        role: 'user',
        content: `根据用户的对话内容，结合历史提问以及智能体介绍和设定，生成接下来用户可能问的3个问题，不要直接回答用户的问题或者其他问题

        历史提问使用 [HISTORY] 和 [END HISTORY]符号包裹 
        [HISTORY]
        ${historyChatList
          ?.filter((item) => {
            return item.role === BOT_ROLE_USER
          })
          .map((item) => {
            return item.content
          })
          .join('\n')}
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
    ]
    return messages as ChatCompletionMessage[]
  }

  async chat (params: { msg?: string; history?: Array<ChatHistoryItem> }) {
    const messages = await this.genRecommendQuestionMessages({
      historyChatList: params.history,
      content: params.msg
    })

    const agent = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      searchEnable: false,
      mcpEnable: false
    })

    await agent.stream({
      messages,
      recordId: 'recommend-questions'
    })
  }
}

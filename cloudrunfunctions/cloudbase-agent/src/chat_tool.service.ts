import {
  aitools,
  GetTextToSpeechResultInput,
  SpeechToTextInput,
  TextToSpeechInput
} from '@cloudbase/aiagent-framework'

import { BotContext } from './bot_context'

type ToolCallResultT =
  | aitools.SearchDBResult
  | aitools.SearchNetworkResult
  | aitools.SearchFileResult
  | aitools.SearchKnowledgeResult;

interface ToolCallResult<T extends ToolCallResultT> {
  // 工具返回的结果
  result: T;
  // 接口内基于 result 封装的提示词
  prompt: string;
}

export class ChatToolService {
  botContext: BotContext

  constructor (botContext: BotContext) {
    this.botContext = botContext
  }

  async handleSearchNetwork ({
    msg,
    searchEnable
  }): Promise<ToolCallResult<aitools.SearchNetworkResult>> {
    if (!searchEnable) {
      return null
    }

    const result = await this.botContext.bot.tools.searchNetwork(
      this.botContext.info.botId,
      msg
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`查询联网内容失败 ${result?.message}`)

    }

    if (result) {
      const data = {
        type: 'search',
        created: Date.now(),
        model: 'hunyuan',
        role: 'assistant',
        content: '',
        search_info: {
          search_results: result.searchInfo?.searchResults
        },
        finish_reason: 'continue'
      }

      this.botContext.bot.sseSender.send(`data: ${JSON.stringify(data)}\n\n`)

      if (result.content) {
        const netKnowledgeList = [
          { question: msg, answer: result.content ?? '' }
        ]
        const netKnowledgeText = netKnowledgeList
          .map(({ question, answer }) => {
            return `### 用户问题:\n${question}\n### 内容：\n${answer}`
          })
          .join('\n')
        const prompt = `

  以下是用户问题可能涉及的一些通过联网搜索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。

  ${netKnowledgeText}

      `
        return {
          prompt: prompt,
          result: result
        }
      }
    }

  }

  async handleSearchFile ({
    msg,
    files
  }): Promise<ToolCallResult<aitools.SearchFileResult>> {
    if (files?.length === 0 || !this.botContext.info.searchFileEnable) {
      return null
    }

    const result = await this.botContext.bot.tools.searchFile(
      this.botContext.info.botId,
      msg,
      files
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`查询文件内容失败: ${result?.message}`)
    }

    if (result && result.content.length > 0) {
      const data = {
        type: "'search_file',",
        created: Date.now(),
        model: 'hunyuan',
        role: 'assistant',
        content: result.content ?? '',
        finish_reason: 'continue'
      }
      this.botContext.bot.sseSender.send(`data: ${JSON.stringify(data)}\n\n`)

      const fileList = [{ question: msg, answer: result.content ?? '' }]
      const searchFileText = fileList
        .map(({ question, answer }) => {
          return `### 标题:\n${question}\n### 内容：\n${answer}`
        })
        .join('\n')
      const prompt = `
<file_search desc="基于图片或PDF等类型的文件检索">
  以下是用户问题可能涉及的一些通过上传图片或PDF等类型的文件检索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。
  <file_search_result>
  ${searchFileText}
  </file_search_result>
</file_search>
`
      return {
        prompt: prompt,
        result: result
      }
    }
  }

  async handleSearchDB ({
    msg
  }): Promise<ToolCallResult<aitools.SearchDBResult>> {
    if (this.botContext.info.databaseModel.length === 0) {
      return null
    }
    const result = await this.botContext.bot.tools.searchDB(
      this.botContext.info.botId,
      msg,
      this.botContext.info.databaseModel
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`查询数据模型内容失败: ${result?.message}`)
    }

    if (result) {
      const data = {
        type: 'db',
        created: Date.now(),
        role: 'assistant',
        content: '',
        finish_reason: 'continue',
        search_results: {
          relateTables: result.searchResult?.relateTables?.length ?? 0
        }
      }
      this.botContext.bot.sseSender.send(`data: ${JSON.stringify(data)}\n\n`)

      const prompt = `
<db_search desc="数据库查询">
  <db_search_result>
  ${result.searchResult?.answerPrompt ?? ''}
  </db_search_result>
</db_search>
`
      return {
        prompt: prompt,
        result: result
      }
    }
  }

  async handleSearchKnowledgeBase ({
    msg
  }): Promise<ToolCallResult<aitools.SearchKnowledgeResult>> {
    if (this.botContext?.info?.knowledgeBase?.length === 0) {
      return null
    }

    const result = await this.botContext.bot.tools.searchKnowledgeBase(
      this.botContext.info.botId,
      msg,
      this.botContext.info.knowledgeBase
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`查询知识库内容失败: ${result?.message}`)
    }

    if (result?.documents?.length > 0) {
      const documentSetNameList = []
      const fileMetaDataList = []
      result?.documents.forEach(({ score, documentSet }) => {
        if (score < 0.7) {
          return
        }
        documentSetNameList.push(documentSet?.documentSetName)
        fileMetaDataList.push(documentSet?.fileMetaData)
      })

      // 知识库
      if (documentSetNameList.length !== 0 && fileMetaDataList.length !== 0) {
        const result = {
          type: 'knowledge',
          created: Date.now(),
          role: 'assistant',
          content: '',
          finish_reason: 'continue',
          knowledge_base: Array.from(documentSetNameList),
          knowledge_meta: Array.from(fileMetaDataList)
        }
        this.botContext?.bot?.sseSender?.send(
          `data: ${JSON.stringify(result)}\n\n`
        )
      }

      const highScoreDocuments = result?.documents?.filter(
        ({ score }) => score > 0.7
      )

      if (highScoreDocuments.length === 0) {
        return {
          prompt: '',
          result: result
        }
      }

      const knowledgeText = highScoreDocuments
        .map(({ data }) => {
          return `### 内容：\n${data.text}`
        })
        .join('\n')

      const prompt = `
<search_knowledge_base desc="知识库检索">
  以下是用户问题可能涉及的一些背景知识和相关资料，。回答问题需要充分依赖这些背景知识和相关资料。请优先参考这部分内容。
  <knowledge_base_result>
  ${knowledgeText}
  </knowledge_base_result>
</search_knowledge_base>
      `
      return {
        prompt: prompt,
        result: result
      }
    }

    return {
      prompt: '',
      result: result
    }
  }

  async speechToText (
    input: SpeechToTextInput
  ): Promise<aitools.SpeechToTextResult> {
    const result = await this.botContext.bot.tools.speechToText(
      this.botContext.info.botId,
      input.engSerViceType,
      input.voiceFormat,
      input.url
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`语音转文字失败: ${result?.message}`)
    }

    return result
  }

  async textToSpeech (
    input: TextToSpeechInput
  ): Promise<aitools.TextToSpeechResult> {

    const result = await this.botContext.bot.tools.textToSpeech(
      this.botContext.info.botId,
      input.text,
      input.voiceType
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`文字转语音失败: ${result?.message}`)
    }

    return result
  }

  async getTextToSpeechResult (
    input: GetTextToSpeechResultInput
  ): Promise<aitools.GetTextToSpeechResult> {
    const result = await this.botContext.bot.tools.getTextToSpeech(
      this.botContext.info.botId,
      input.taskId
    )

    if (result?.code && result?.code?.length !== 0) {
      throw new Error(`查询文字转语音状态失败: ${result?.message}`)
    }

    return result
  }
}

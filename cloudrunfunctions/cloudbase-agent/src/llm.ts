import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import { APICallError } from 'ai'
import * as ai from 'ai'
import OpenAI from 'openai'

import { BotContext } from './bot_context'
import {
  EXCEED_TOKEN_QUOTA_LIMIT,
  EXCEED_TOKEN_QUOTA_LIMIT_MESSAGE,
  REQUEST_LLM_ERROR_CODE,
  REQUEST_LLM_ERROR_MESSAGE
} from './constant'
import { McpClient } from './mcp'
import { getAccessToken } from './tcb'
import { extractWithLodash, safeJsonParse } from './utils'

const DEEPSEEK_PREFIX = 'deepseek'

export type ChatCompletionMessage =
  OpenAI.Chat.Completions.ChatCompletionMessageParam & {
    tool_calls?: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[];
    toolName?: string;
  };

export interface IMsgResult {
  // knowledge_base?: any[];
  // knowledge_meta?: any[];
  type: string;
  created: number;
  record_id: string;
  model: string;
  // version?: string;
  role?: string;
  reasoning_content?: string;
  content: string;
  finish_reason?: string;
  error?: {
    name?: string;
    message: string;
    code?: string;
  };
  tool_call?: string;
  usage: object;
}

export interface ModelInfo {
  model: string;
  baseURL: string;
  apiKey: string;
}

export interface LLMCommunicatorOptions {
  searchEnable?: boolean;
  mcpEnable?: boolean;
}

type ToolResult = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
};

type StreamResult = {
  error: unknown;
  chunks: string;
  callMsg: IMsgResult[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export class LLMCommunicator {
  botContext: BotContext

  model: ai.LanguageModelV1
  modelInfo: ModelInfo

  mcpEnable: boolean = true
  mcpClient?: McpClient

  controller: AbortController

  constructor (botContext: BotContext, options: LLMCommunicatorOptions) {
    this.botContext = botContext
    this.modelInfo = {
      model: botContext.config.model,
      baseURL: botContext.config.baseURL,
      apiKey: botContext.config.apiKey || getAccessToken(botContext.context)
    }
    this.initModel()

    if (options.mcpEnable) {
      this.mcpClient = new McpClient(botContext)
    }

    this.controller = new AbortController()
  }

  private initModel () {
    let openaiFunc: ai.LanguageModelV1 | typeof createDeepSeek = createOpenAI
    if (this.modelInfo.model.startsWith(DEEPSEEK_PREFIX)) {
      openaiFunc = createDeepSeek
    }

    const openai = openaiFunc({
      apiKey: this.modelInfo.apiKey,
      baseURL: this.modelInfo.baseURL,
      fetch: async (url, options) => {
        return await fetch(url, options)
      }
    })

    this.model = openai(this.modelInfo.model)
  }

  /**
   * 将openAi标准message转换成CoreMessage
   */
  private tarnsMessage (messages: ChatCompletionMessage[]): ai.CoreMessage[] {
    return messages.map((v) => {
      if (v.role === 'tool') {
        return {
          ...v,
          content: [
            {
              type: 'tool-result',
              toolCallId: v.tool_call_id,
              toolName: v.toolName,
              result: v.content
            }
          ]
        }
      }

      return v
    }) as ai.CoreMessage[]
  }

  /**
   * 处理streamText输出
   */
  private dealStreamText (
    streamPart: ai.TextStreamPart<ai.ToolSet> | ToolResult
  ): {
      type: string;
      content: string;
    } {
    if (streamPart.type === 'text-delta') {
      return { type: 'text', content: streamPart.textDelta }
    } else if (streamPart.type === 'reasoning') {
      return { type: 'reasoning', content: streamPart.textDelta }
    } else if (streamPart.type === 'tool-call') {
      const toolCalls = {
        index: 0,
        id: streamPart.toolCallId,
        type: 'function' as const,
        function: { name: streamPart.toolName, arguments: streamPart.args }
      }
      return { type: 'tool-call', content: JSON.stringify(toolCalls) }
    } else if (streamPart.type === 'tool-result') {
      // 调用工具的返回结果
      const result = {
        ...streamPart,
        toolCallId: streamPart.toolCallId,
        toolName: streamPart.toolName,
        args: streamPart.args,
        result: streamPart.result
      }
      return { type: 'tool-result', content: JSON.stringify(result) }
    }

    return { type: streamPart.type || '', content: '', ...streamPart }
  }

  /**
   * 发送对话给LLM，并处理信息流
   */
  private async streamText (
    messages: ChatCompletionMessage[],
    cb: (streamPart: ai.TextStreamPart<ai.ToolSet>) => void
  ) {
    try {
      const { fullStream } = ai.streamText({
        model: this.model,
        tools: await this.mcpClient?.tools(),
        maxSteps: 10,
        messages: this.tarnsMessage([...messages]),
        abortSignal: this.controller.signal,
        onFinish: () => {
          this.mcpClient?.close()
        }
      })

      for await (const streamPart of fullStream) {
        cb(streamPart)
      }
    } catch (e) {
      cb?.({
        type: 'error',
        content: '',
        step: 'error',
        error: e,
        finishReason: 'error'
      })

      console.log('streamText_error:', JSON.stringify({ error: e, msg: e.message }))
    }
  }

  /**
   * 发送流式对话
   */
  async stream ({
    messages,
    recordId
  }: {
    messages: ChatCompletionMessage[];
    recordId: string;
  }): Promise<StreamResult> {
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let chunks = ''
    const callMsg: IMsgResult[] = []
    let error = undefined

    try {
      await this.streamText(
        messages,
        (streamPart: ai.TextStreamPart<ai.ToolSet>) => {
          const tc = this.dealStreamText(streamPart)
          let result: IMsgResult = {
            type: tc.type,
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            content: '',
            usage: {}
          }

          if (tc.type === 'text' && tc.content) {
            result = {
              ...result,
              role: 'assistant',
              content: tc.content,
              finish_reason: 'continue'
            }
            chunks += tc.content
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
          } else if (tc.type === 'reasoning') {
            result = {
              ...result,
              type: 'thinking',
              role: 'assistant',
              reasoning_content: tc.content,
              finish_reason: 'continue'
            }
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
          } else if (tc.type === 'tool-call') {
            // 工具调用开始
            result = {
              ...result,
              tool_call: JSON.parse(tc.content)
            }
            callMsg.push(result)
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
          } else if (tc.type === 'tool-result') {
            // 工具调用结果返回
            result = {
              ...result,
              ...JSON.parse(tc.content),
              content: ''
            }
            callMsg.push(result)
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
          } else if (
            streamPart.type === 'step-finish' &&
            streamPart.finishReason === 'tool-calls'
          ) {
            // 工具调用结束
            result = {
              ...result,
              content: '\n',
              finish_reason: streamPart.finishReason
            }
            chunks += '\n'
            callMsg.push({ ...result, content: chunks, type: 'text' })
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
            chunks = ''
          } else if (streamPart.type === 'finish') {
            // 整体对话结束
            result = {
              ...result,
              finish_reason: streamPart.finishReason,
              usage: streamPart.usage || {}
            }
            promptTokens = streamPart.usage?.promptTokens ?? 0
            completionTokens = streamPart.usage?.completionTokens ?? 0
            totalTokens = streamPart.usage?.totalTokens ?? 0
            callMsg.push({ ...result, content: chunks, type: 'text' })

            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )
          } else if (streamPart.type === 'error') {
            // 对话异常
            const gwLLMError = this.handlerAICallError(
              (streamPart as any).error?.lastError || (streamPart as any).error
            )
            result = {
              ...result,
              finish_reason: 'error',
              error: gwLLMError
            }
            error = (streamPart as any).error

            console.log('stream_error:', JSON.stringify({
              msg: (streamPart as any).error,
              errMsg: (streamPart as any).error?.message
            }))

            callMsg.push(result)
            this.botContext.bot.sseSender.send(
              `data: ${JSON.stringify(result)}\n\n`
            )

            this.controller.abort()
          }
        }
      )
    } catch (error) {
      const gwLLMError = this.handlerAICallError(
        (error as any)?.lastError || error
      )
      let result: IMsgResult = {
        type: 'error',
        created: Date.now(),
        record_id: recordId,
        model: this.modelInfo.model,
        content: '',
        usage: {}
      }
      result = {
        ...result,
        finish_reason: 'error',
        error: gwLLMError
      }

      console.log('stream_error:', JSON.stringify({ error, msg: (error as any)?.message }))

      callMsg.push(result)
      this.botContext.bot.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)

      this.controller.abort()
    }

    return {
      error,
      chunks,
      callMsg,
      promptTokens,
      completionTokens,
      totalTokens
    }
  }

  /**
   * 发送非流式对话
   */
  async text ({ messages, cb }) {
    try {
      const data = {
        model: this.model,
        tools: await this.mcpClient?.tools(),
        messages: this.tarnsMessage([...messages]),
        maxSteps: 10,
        abortSignal: this.controller.signal,
        onFinish: () => {
          this.mcpClient?.close()
        }
      }

      const generateTextRes = await ai.generateText(data)
      return cb(generateTextRes)
    } catch (error) {
      console.log('generateText_error:', JSON.stringify({ error, msg: (error as any)?.message }))
      const gwLLMError = this.handlerAICallError(
        (error as any)?.lastError || error
      )
      return { error: gwLLMError }
    }
  }

  /**
   * 解析 LLM 调用错误，转换为统一的内部错误码和友好消息
   */
  handlerAICallError (callError: APICallError) {
    const responseBody = safeJsonParse(callError?.responseBody)
    const result = extractWithLodash(responseBody, ['message', 'code'])
    const code = result?.code?.includes(EXCEED_TOKEN_QUOTA_LIMIT)
      ? EXCEED_TOKEN_QUOTA_LIMIT
      : result?.code?.[0] || REQUEST_LLM_ERROR_CODE
    let message = result?.message?.[0] || REQUEST_LLM_ERROR_MESSAGE
    if (code === EXCEED_TOKEN_QUOTA_LIMIT) {
      message = EXCEED_TOKEN_QUOTA_LIMIT_MESSAGE
    }
    return {
      code,
      message
    }
  }
}

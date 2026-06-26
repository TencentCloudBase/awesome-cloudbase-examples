import OpenAI from 'openai'
import {
  convertMessagesToOpenAI,
  processOpenAIStream
} from '@cloudbase/agent-adapter-llm'
import { Message, BaseEvent, EventType } from '@ag-ui/client'
import { BotContext } from '../types/bot_context.js'
import { McpClient } from './mcp.js'
import { getApiKey } from '../config/env.js'
import type { SSESender } from '../types/context.js'

export type ChatCompletionMessage =
  OpenAI.Chat.Completions.ChatCompletionMessageParam & {
    tool_calls?: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall[]
    toolName?: string
  }

export interface IMsgResult {
  type: string
  created: number
  record_id: string
  model: string
  role?: string
  reasoning_content?: string
  content: string
  finish_reason?: string
  error?: {
    name: string
    message: string
  }
  tool_call?: string
  usage: object
}

export interface ModelInfo {
  model: string
  baseURL: string
  apiKey: string
}

export interface LLMCommunicatorOptions {
  searchEnable?: boolean
  mcpEnable?: boolean
  model?: string
  baseURL?: string
  apiKey?: string
}

type StreamResult = {
  error: unknown
  chunks: string
  callMsg: IMsgResult[]
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export class LLMCommunicator {
  botContext: BotContext
  openai!: OpenAI
  modelInfo: ModelInfo

  mcpEnable: boolean = true
  mcpClient?: McpClient

  controller: AbortController
  private sseSender?: SSESender

  constructor(botContext: BotContext, options: LLMCommunicatorOptions) {
    this.botContext = botContext
    this.modelInfo = {
      model: options.model || botContext.config.model,
      baseURL: options.baseURL || botContext.config.baseURL,
      apiKey: options.apiKey || botContext.config.apiKey || getApiKey()
    }
    this.initModel()

    this.mcpEnable = !!options.mcpEnable
    if (this.mcpEnable) {
      this.mcpClient = new McpClient(botContext)
    }

    this.controller = new AbortController()
  }

  /**
   * 设置 SSE 发送器
   */
  setSSESender(sseSender: SSESender) {
    this.sseSender = sseSender
  }

  private initModel() {
    this.openai = new OpenAI({
      apiKey: this.modelInfo.apiKey,
      baseURL: this.modelInfo.baseURL
    })
  }

  private normalizeToolParameters(parameters: unknown): Record<string, unknown> {
    if (parameters && typeof parameters === 'object' && !Array.isArray(parameters)) {
      return parameters as Record<string, unknown>
    }

    return {
      type: 'object',
      properties: {},
      additionalProperties: true
    }
  }

  private async getOpenAITools(): Promise<
    OpenAI.Chat.Completions.ChatCompletionTool[] | undefined
  > {
    if (!this.mcpEnable || !this.mcpClient) {
      return undefined
    }

    try {
      const mcpTools = await this.mcpClient.tools()
      const toolEntries = Object.entries(mcpTools)

      if (!toolEntries.length) {
        return undefined
      }

      return toolEntries.map(([name, toolDef]) => ({
        type: 'function',
        function: {
          name,
          description: toolDef.description || '',
          parameters: this.normalizeToolParameters(toolDef.parameters)
        }
      }))
    } catch (error) {
      console.log('getOpenAITools error:', error)
      return undefined
    }
  }

  /**
   * 将 ChatCompletionMessage 转换为 @ag-ui/client Message 格式
   * 用于适配 adapter-llm 的 convertMessagesToOpenAI
   */
  private toAGUIMessages(messages: ChatCompletionMessage[]): Message[] {
    return messages.map((msg) => {
      const role = msg.role as 'user' | 'assistant' | 'system' | 'tool'

      if (role === 'tool') {
        return {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          role: 'tool' as const,
          toolCallId: (msg as any).tool_call_id || '',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }
      }

      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: role as 'user' | 'assistant',
        content: typeof msg.content === 'string' ? msg.content : '',
        toolCalls: msg.tool_calls?.map((tc) => ({
          id: tc.id || `tool_${tc.index}`,
          type: 'function' as const,
          function: {
            name: tc.function?.name || '',
            arguments: tc.function?.arguments || ''
          }
        }))
      }
    }) as Message[]
  }

  /**
   * 发送流式对话 - 使用 SSE
   * 内部使用 @cloudbase/agent-adapter-llm 的 processOpenAIStream
   */
  async stream({
    messages,
    recordId,
    systemPrompt
  }: {
    messages: ChatCompletionMessage[]
    recordId: string
    systemPrompt?: string
  }): Promise<StreamResult> {
    let chunks = ''
    const callMsg: IMsgResult[] = []
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0
    let error: unknown = null

    try {
      // 使用 adapter-llm 的消息转换器
      const aguiMessages = this.toAGUIMessages(messages)
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt)
      const tools = await this.getOpenAITools()

      const stream = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        ...(tools
          ? {
              tools,
              tool_choice: 'auto' as const
            }
          : {})
      })

      // 创建流处理上下文
      const context = {
        threadId: recordId,
        runId: recordId,
        messageId: `msg_${Date.now()}`
      }

      let latestFinishReason = 'stop'

      // 使用 adapter-llm 的流处理器
      for await (const event of processOpenAIStream(stream, context)) {
        const eventType = event.type
        const eventAny = event as Record<string, any>

        const finishReasonFromEvent =
          eventAny.finish_reason ||
          eventAny.finishReason ||
          eventAny.reason ||
          eventAny.delta?.finish_reason
        if (
          typeof finishReasonFromEvent === 'string' &&
          finishReasonFromEvent !== 'continue'
        ) {
          latestFinishReason = finishReasonFromEvent
        }

        const usage =
          eventAny.usage || eventAny.response?.usage || eventAny.chunk?.usage
        if (usage && typeof usage === 'object') {
          promptTokens = Number(usage.prompt_tokens ?? usage.promptTokens ?? promptTokens)
          completionTokens = Number(
            usage.completion_tokens ?? usage.completionTokens ?? completionTokens
          )
          totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? totalTokens)
        }

        // 将 AGUI 事件转换为 IMsgResult 格式
        if (eventType === 'TEXT_MESSAGE_CONTENT') {
          const delta = (event as any).delta || ''
          chunks += delta

          const result: IMsgResult = {
            type: 'text',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: delta,
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
          callMsg.push(result)
        }

        // 处理思考过程开始
        if (eventType === 'THINKING_START') {
          const result: IMsgResult = {
            type: 'thinking_start',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
        }

        // 处理思考文本消息开始
        if (eventType === 'THINKING_TEXT_MESSAGE_START') {
          const result: IMsgResult = {
            type: 'thinking_text_start',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
        }

        // 处理推理内容 (DeepSeek reasoner)
        if (eventType === 'THINKING_TEXT_MESSAGE_CONTENT') {
          const delta = (event as any).delta || ''

          const result: IMsgResult = {
            type: 'reasoning',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            reasoning_content: delta,
            content: '',
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
          callMsg.push(result)
        }

        // 处理思考文本消息结束
        if (eventType === 'THINKING_TEXT_MESSAGE_END') {
          const result: IMsgResult = {
            type: 'thinking_text_end',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
        }

        // 处理思考过程结束
        if (eventType === 'THINKING_END') {
          const result: IMsgResult = {
            type: 'thinking_end',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
        }

        // 处理工具调用开始
        if (eventType === 'TOOL_CALL_START') {
          const toolCallId = (event as any).toolCallId
          const toolCallName = (event as any).toolCallName

          const result: IMsgResult = {
            type: 'tool_call_start',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            tool_call: JSON.stringify({ id: toolCallId, name: toolCallName }),
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
          callMsg.push(result)
        }

        // 处理工具调用参数
        if (eventType === 'TOOL_CALL_ARGS') {
          const toolCallId = (event as any).toolCallId
          const delta = (event as any).delta || ''

          const result: IMsgResult = {
            type: 'tool_call_args',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: delta,
            tool_call: JSON.stringify({ id: toolCallId }),
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
          callMsg.push(result)
        }

        // 处理工具调用结束
        if (eventType === 'TOOL_CALL_END') {
          const toolCallId = (event as any).toolCallId

          const result: IMsgResult = {
            type: 'tool_call_end',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            tool_call: JSON.stringify({ id: toolCallId }),
            finish_reason: 'continue',
            usage: {}
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}\n\n`)
          }
          callMsg.push(result)
        }

        // 处理文本消息结束
        if (eventType === 'TEXT_MESSAGE_END') {
          const finishResult: IMsgResult = {
            type: 'finish',
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: 'assistant',
            content: '',
            finish_reason: latestFinishReason,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens
            }
          }

          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(finishResult)}\n\n`)
          }
        }
      }
    } catch (e) {
      error = e
      console.error('LLM stream error:', e)

      const err = e as Error
      const errorResult: IMsgResult = {
        type: 'error',
        created: Date.now(),
        record_id: recordId,
        model: this.modelInfo.model,
        role: 'assistant',
        content: '',
        finish_reason: 'error',
        error: {
          name: err.name || 'Error',
          message: err.message || 'Unknown error'
        },
        usage: {}
      }

      if (this.sseSender) {
        this.sseSender.send(`data: ${JSON.stringify(errorResult)}\n\n`)
      }
    } finally {
      await this.mcpClient?.close()
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
   * 流式对话生成器 - 用于 AG-UI
   * 直接透传 @cloudbase/agent-adapter-llm 的 processOpenAIStream 产出的 AG-UI 事件
   * 不做任何翻译或过滤，所有事件类型（包括 THINKING_* 系列）完整传递
   */
  async *streamEvents({
    messages,
    recordId,
    systemPrompt
  }: {
    messages: ChatCompletionMessage[]
    recordId: string
    systemPrompt?: string
  }): AsyncGenerator<BaseEvent> {
    try {
      // 使用 adapter-llm 的消息转换器
      const aguiMessages = this.toAGUIMessages(messages)
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt)
      const tools = await this.getOpenAITools()

      const stream = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        ...(tools
          ? {
              tools,
              tool_choice: 'auto' as const
            }
          : {})
      })

      // 创建流处理上下文
      const context = {
        threadId: recordId,
        runId: recordId,
        messageId: `msg_${Date.now()}`
      }

      // 直接透传所有 AG-UI 事件
      for await (const event of processOpenAIStream(stream, context)) {
        yield event as BaseEvent
      }
    } catch (e) {
      // 产出一个 RUN_ERROR 事件，保持 AG-UI 协议一致性
      yield {
        type: EventType.RUN_ERROR,
        message: e instanceof Error ? e.message : 'LLM error'
      } as BaseEvent
    } finally {
      await this.mcpClient?.close()
    }
  }

  /**
   * 非流式对话
   */
  async text({
    messages,
    systemPrompt,
    cb
  }: {
    messages: ChatCompletionMessage[]
    systemPrompt?: string
    cb: (result: OpenAI.Chat.Completions.ChatCompletion) => unknown
  }): Promise<unknown> {
    try {
      // 使用 adapter-llm 的消息转换器
      const aguiMessages = this.toAGUIMessages(messages)
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt)

      const tools = await this.getOpenAITools()
      const response = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        ...(tools
          ? {
              tools,
              tool_choice: 'auto' as const
            }
          : {})
      })
      return cb(response)
    } catch (error) {
      console.error('LLM text error:', error)
      return {}
    } finally {
      await this.mcpClient?.close()
    }
  }
}

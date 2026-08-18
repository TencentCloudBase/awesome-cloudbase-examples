import { PostClientTransport } from '@cloudbase/mcp/transport/client/post'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

import { BotContext } from '../types/bot_context.js'
import { getApiKey } from '../config/env.js'
import { mcpProcessContent, McpContent } from '../utils/tcb.js'

/**
 * 简化的工具集类型定义（不依赖 ai SDK）
 */
export interface ToolDefinition {
  description?: string
  parameters: unknown
  execute: (params: Record<string, unknown>) => Promise<unknown>
}

export type ToolSet = Record<string, ToolDefinition>

export interface McpTools {
  name: string
}

export interface McpServer {
  name?: string
  url?: string
  transport: string
  tools: McpTools[]
}

export interface McpTransportConfig {
  name?: string
  url: URL
  transport: string
  tools?: McpTools[]
  requestInit?: RequestInit
  executeHook?: (res: unknown) => Promise<unknown>
}

/**
 * 检查 MCP URL 是否有效
 */
function mcpJudgeMcpUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    const urlFormat = new URL(url)
    return /(service.tcloudbase.com)|(api.tcloudbasegateway.com)$/.test(
      urlFormat.host
    )
  } catch (error) {
    console.log('mcpJudgeMcpUrl error:', error)
  }
  return false
}

/**
 * 处理 MCP 服务器列表，生成传输配置
 */
export function dealMcpServerList(mcpServers: McpServer[]): McpTransportConfig[] {
  const accessToken = getApiKey()
  return mcpServers
    .filter((v) => mcpJudgeMcpUrl(v.url))
    .map((v: McpServer) => {
      return {
        name: v.name,
        url: new URL(v.url!),
        transport: v.transport,
        tools: v.tools || [],
        requestInit: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        },
        /* eslint-disable @typescript-eslint/no-explicit-any */
        executeHook: async (toolResult: any) => {
          // MCP 结果处理 hook - 处理图片等资源
          if (toolResult?.content && Array.isArray(toolResult.content)) {
            toolResult.content = await Promise.all(
              toolResult.content.map(
                async (mcpContent: McpContent) =>
                  await mcpProcessContent(mcpContent, v.name || 'unknown')
                    .then((result) => result)
                    .catch(() => mcpContent)
              )
            )
          }
          return toolResult
        }
      } as McpTransportConfig
    })
}

export class McpClient {
  private botContext: BotContext

  private _tools: ToolSet | null = null
  private _initPromise: Promise<void> | null = null
  private mcpClientMap: Record<string, Client> = {}
  private transportConfigs: McpTransportConfig[]
  private mcpServers: McpServer[]

  constructor(botContext: BotContext) {
    this.botContext = botContext
    this.mcpServers = this.botContext.info?.mcpServerList || []
    this.transportConfigs = dealMcpServerList(this.mcpServers)
    this._tools = null
  }

  async tools(): Promise<ToolSet> {
    await this.tryInitTools()
    return this._tools || {}
  }

  async close() {
    try {
      const clients = Object.values(this.mcpClientMap)
      await Promise.all(clients.map((v) => v?.close()))
    } catch (error) {
      console.log(error)
    }
  }

  private async tryInitTools() {
    if (this._tools !== null) return
    if (this._initPromise) return this._initPromise
    this._initPromise = this.initTools().catch((error) => {
      console.log(error)
      this._initPromise = null
    })
    return this._initPromise
  }

  private async initTools() {
    const tools = await Promise.all(
      this.transportConfigs.map((transportConfig) =>
        this.listTools(transportConfig)
      )
    )

    let urlTools: ToolSet = {}

    for (let i = 0; i < tools.length; i++) {
      urlTools = { ...urlTools, ...tools[i] }
    }

    this._tools = { ...this._tools, ...urlTools }
  }

  private async listTools(
    transportConfig: McpTransportConfig
  ): Promise<ToolSet> {
    const timeout = 10000
    let timeId: NodeJS.Timeout | undefined

    const urlTools: ToolSet = {}

    try {
      let transport:
        | SSEClientTransport
        | StreamableHTTPClientTransport
        | PostClientTransport
      if (transportConfig.transport === 'sse') {
        transport = new SSEClientTransport(transportConfig.url, {
          eventSourceInit: {
            fetch: async (url, init) =>
              fetch(url, {
                ...init,
                headers: {
                  ...(init?.headers || {}),
                  ...(transportConfig.requestInit?.headers || {})
                }
              })
          },
          requestInit: transportConfig.requestInit
        })
      } else if (transportConfig.transport === 'streamable') {
        transport = new StreamableHTTPClientTransport(transportConfig.url, {
          requestInit: transportConfig.requestInit
        })
      } else {
        transport = new PostClientTransport(transportConfig.url, {
          requestInit: transportConfig.requestInit
        })
      }

      const transportName = `${+new Date()}_${Math.floor(Math.random() * 100)}`
      const mcpClient = new Client(
        {
          name: 'mcp-client',
          version: '1.0.0'
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {}
          }
        }
      )

      this.mcpClientMap[transportName] = mcpClient

      const connectWithTimeout = async () => {
        const timeoutPromise = new Promise<'timeout'>((resolve) => {
          timeId = setTimeout(() => resolve('timeout'), timeout)
        })

        const connectPromise = (async () => {
          await this.mcpClientMap[transportName].connect(transport)
          return 'connected' as const
        })()

        const result = await Promise.race([timeoutPromise, connectPromise])

        if (timeId) {
          clearTimeout(timeId)
        }

        if (result === 'timeout') {
          console.log(`MCP connect timeout for ${transportConfig.name || transportConfig.url}`)
          return urlTools
        }

        return null // 连接成功，继续后续逻辑
      }

      const earlyReturn = await connectWithTimeout()
      if (earlyReturn) {
        return earlyReturn
      }

      const toolsResult = await this.mcpClientMap[transportName].listTools()

      toolsResult?.tools?.forEach((v) => {
        // 筛选 config 中的 tools，仅保留 config 中的 tools
        if (
          !transportConfig?.tools ||
          transportConfig.tools.find((item) => item.name === v.name)
        ) {
          urlTools[
            `${transportConfig.name ? `${transportConfig.name}/` : ''}${v.name}`
          ] = {
            description: v.description,
            parameters: v.inputSchema,
            execute: async (params: Record<string, unknown>) => {
              const mcpToolResult = await this.mcpClientMap[
                transportName
              ].callTool({
                name: v.name,
                arguments: params
              })

              if (typeof transportConfig.executeHook === 'function') {
                return await transportConfig.executeHook(mcpToolResult)
              }

              return mcpToolResult
            }
          }
        }
      })

      if (timeId) {
        clearTimeout(timeId)
      }

      return urlTools
    } catch (error) {
      console.log(error)
      if (timeId) {
        clearTimeout(timeId)
      }
    }
    return urlTools
  }
}

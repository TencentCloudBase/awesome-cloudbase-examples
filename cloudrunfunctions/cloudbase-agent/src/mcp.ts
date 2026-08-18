import { PostClientTransport } from '@cloudbase/mcp/transport/client/post'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import * as ai from 'ai'

import { BotContext } from './bot_context'
import { dealMcpServerList } from './tcb'

export interface McpTools {
  name: string;
}

export interface McpServer {
  name?: string;
  url?: string;
  transport: string;
  tools: McpTools[];
}

export interface McpTransportConfig {
  name?: string;
  url: URL;
  transport: string;
  tools?: McpTools[];
  requestInit?: RequestInit;
  executeHook?: (res: unknown) => Promise<unknown>;
}

export class McpClient {
  private botContext: BotContext

  private _tools: ai.ToolSet | null = null
  private mcpClientMap: Record<string, Client> = {}
  private transportConfigs: McpTransportConfig[]
  private mcpServers: McpServer[]

  constructor (botContext: BotContext) {
    this.botContext = botContext
    this.mcpServers = this.botContext.info?.mcpServerList || []
    this.transportConfigs = dealMcpServerList(
      this.botContext.context,
      this.mcpServers
    )
    this._tools = null
  }

  async tools (): Promise<ai.ToolSet> {
    await this.tryInitTools()
    return this._tools || {}
  }

  async close () {
    try {
      const clients = Object.values(this.mcpClientMap)
      await Promise.all(clients.map((v) => v?.close()))
    } catch (error) {
      console.log(error)
    }
  }

  private async tryInitTools () {
    if (this._tools !== null) return
    try {
      await this.initTools()
    } catch (error) {
      console.log(error)
    }
  }

  private async initTools () {
    const tools = await Promise.all(
      this.transportConfigs.map((transportConfig) =>
        this.listTools(transportConfig)
      )
    )

    let urlTools: ai.ToolSet = {}

    for (let i = 0; i < tools.length; i++) {
      urlTools = { ...urlTools, ...tools[i] }
    }

    this._tools = { ...this._tools, ...urlTools }
  }

  private async listTools (
    transportConfig: McpTransportConfig
  ): Promise<ai.ToolSet> {
    const timeout = 10000
    let timeId: NodeJS.Timeout | undefined

    const urlTools: ai.ToolSet = {}

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
                  // Accept: 'text/event-stream',
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

      const timeFunc = async () =>
        new Promise((resolve, reject) => {
          timeId = setTimeout(() => {
            reject({ urlTools })
          }, timeout)
        })

      const connectFunc = async () => {
        await this.mcpClientMap[transportName].connect(transport)

        if (timeId) {
          clearTimeout(timeId)
        }
        throw {}
      }

      try {
        await Promise.all([timeFunc(), connectFunc()])
      } catch (error) {
        if (error.urlTools) {
          console.log('error:', error)
          return error.urlTools
        }
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
            parameters: ai.jsonSchema<unknown>(v.inputSchema),
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

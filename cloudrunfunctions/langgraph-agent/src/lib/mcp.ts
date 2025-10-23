import { PostClientTransport } from '@cloudbase/mcp/transport/client/post';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { getAccessToken } from './tcb';

import { AgentContext } from './agent_context';

/**
 * MCP工具接口
 */
export interface McpTools {
  /** 工具名称 */
  name: string;
}

/**
 * MCP服务器接口
 */
export interface McpServer {
  /** 服务器名称 */
  name: string;
  /** 服务器URL */
  url: string;
  /** 传输协议类型 */
  transport: string;
  /** 工具列表 */
  tools: McpTools[];
}

/**
 * MCP管理器类
 * 负责管理MCP客户端连接和工具调用
 */
export class McpManager {
  /** Agent上下文 */
  private agentContext: AgentContext<any>;
  /** MCP客户端映射 */
  private mcpClientMap: Record<string, Client | null> = {};
  /** MCP服务器列表 */
  public mcpServers: McpServer[];

  /**
   * 构造函数
   * @param agentContext - Agent上下文
   */
  constructor(agentContext: AgentContext<any>) {
    this.agentContext = agentContext;
    this.mcpServers = this.agentContext.info?.mcpServerList || [];
  }

  /**
   * 关闭所有MCP客户端连接
   */
  async close() {
    try {
      const clients = Object.values(this.mcpClientMap);
      await Promise.all(clients.map((v) => v?.close()));
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * 获取MCP客户端
   * @param mcpServer - MCP服务器配置
   * @returns Promise<Client | null> - MCP客户端实例
   */
  async getMCPClient(mcpServer: McpServer) {
    const { url, transport: transportType } = mcpServer
    const apiKey = getAccessToken(this.agentContext.context);
    let transport = null
    if (transportType === 'post') {
      transport = new PostClientTransport(
        new URL(url),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        }
      );
    } else if (transportType === 'sse') {
      transport = new SSEClientTransport(
        new URL(url),
        {
          eventSourceInit: {
            fetch: async (url, init) =>
              fetch(url, {
                ...(init || {}),
                headers: {
                  ...(init?.headers || {}),
                  ... {
                    Authorization: `Bearer ${apiKey}`,
                  },
                },
              }),
          },
          requestInit: {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        }
      );
    } else if (transportType === 'streamable') {
      transport = new StreamableHTTPClientTransport(
        new URL(url),
        {
          requestInit: {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        }
      );
    }

    if (transport) {
      const proxiedTransport = new Proxy(transport, {
        set(target, prop, value) {
          if (prop === "onmessage") {
            target.onmessage = (message: any) => {
              if (
                (message as any)?.result?.toolResult &&
                !(message as any).result.structuredContent
              ) {
                (message as any).result.structuredContent = (
                  message as any
                ).result.toolResult;
              }
              value(message);
            };
            return true;
          }
          return Reflect.set(target, prop, value);
        },
      });

      const client = new Client(
        {
          name: "langgraph-agent",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await client.connect(proxiedTransport);
      console.log("🔧mcp client connect success");
      return client;
    }
    return null
  }

  /**
   * 初始化MCP客户端映射
   * @returns Promise<Record<string, Client | null>> - 客户端映射
   */
  async initMCPClientMap() {
    await Promise.all(this.mcpServers.map(async (mcpServer) => {
      this.mcpClientMap[mcpServer.name] = await this.getMCPClient(mcpServer);
    }));
    return this.mcpClientMap;
  }
}

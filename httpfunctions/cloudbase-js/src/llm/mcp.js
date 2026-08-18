"use strict";
import { PostClientTransport } from "@cloudbase/mcp/transport/client/post";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getApiKey } from "../config/env.js";
import { mcpProcessContent } from "../utils/tcb.js";
function mcpJudgeMcpUrl(url) {
  if (!url) return false;
  try {
    const urlFormat = new URL(url);
    return /(service.tcloudbase.com)|(api.tcloudbasegateway.com)$/.test(
      urlFormat.host
    );
  } catch (error) {
    console.log("mcpJudgeMcpUrl error:", error);
  }
  return false;
}
export function dealMcpServerList(mcpServers) {
  const accessToken = getApiKey();
  return mcpServers.filter((v) => mcpJudgeMcpUrl(v.url)).map((v) => {
    return {
      name: v.name,
      url: new URL(v.url),
      transport: v.transport,
      tools: v.tools || [],
      requestInit: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      /* eslint-disable @typescript-eslint/no-explicit-any */
      executeHook: async (toolResult) => {
        if (toolResult?.content && Array.isArray(toolResult.content)) {
          toolResult.content = await Promise.all(
            toolResult.content.map(
              async (mcpContent) => await mcpProcessContent(mcpContent, v.name || "unknown").then((result) => result).catch(() => mcpContent)
            )
          );
        }
        return toolResult;
      }
    };
  });
}
export class McpClient {
  botContext;
  _tools = null;
  _initPromise = null;
  mcpClientMap = {};
  transportConfigs;
  mcpServers;
  constructor(botContext) {
    this.botContext = botContext;
    this.mcpServers = this.botContext.info?.mcpServerList || [];
    this.transportConfigs = dealMcpServerList(this.mcpServers);
    this._tools = null;
  }
  async tools() {
    await this.tryInitTools();
    return this._tools || {};
  }
  async close() {
    try {
      const clients = Object.values(this.mcpClientMap);
      await Promise.all(clients.map((v) => v?.close()));
    } catch (error) {
      console.log(error);
    }
  }
  async tryInitTools() {
    if (this._tools !== null) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this.initTools().catch((error) => {
      console.log(error);
      this._initPromise = null;
    });
    return this._initPromise;
  }
  async initTools() {
    const tools = await Promise.all(
      this.transportConfigs.map(
        (transportConfig) => this.listTools(transportConfig)
      )
    );
    let urlTools = {};
    for (let i = 0; i < tools.length; i++) {
      urlTools = { ...urlTools, ...tools[i] };
    }
    this._tools = { ...this._tools, ...urlTools };
  }
  async listTools(transportConfig) {
    const timeout = 1e4;
    let timeId;
    const urlTools = {};
    try {
      let transport;
      if (transportConfig.transport === "sse") {
        transport = new SSEClientTransport(transportConfig.url, {
          eventSourceInit: {
            fetch: async (url, init) => fetch(url, {
              ...init,
              headers: {
                ...init?.headers || {},
                ...transportConfig.requestInit?.headers || {}
              }
            })
          },
          requestInit: transportConfig.requestInit
        });
      } else if (transportConfig.transport === "streamable") {
        transport = new StreamableHTTPClientTransport(transportConfig.url, {
          requestInit: transportConfig.requestInit
        });
      } else {
        transport = new PostClientTransport(transportConfig.url, {
          requestInit: transportConfig.requestInit
        });
      }
      const transportName = `${+/* @__PURE__ */ new Date()}_${Math.floor(Math.random() * 100)}`;
      const mcpClient = new Client(
        {
          name: "mcp-client",
          version: "1.0.0"
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {}
          }
        }
      );
      this.mcpClientMap[transportName] = mcpClient;
      const connectWithTimeout = async () => {
        const timeoutPromise = new Promise((resolve) => {
          timeId = setTimeout(() => resolve("timeout"), timeout);
        });
        const connectPromise = (async () => {
          await this.mcpClientMap[transportName].connect(transport);
          return "connected";
        })();
        const result = await Promise.race([timeoutPromise, connectPromise]);
        if (timeId) {
          clearTimeout(timeId);
        }
        if (result === "timeout") {
          console.log(`MCP connect timeout for ${transportConfig.name || transportConfig.url}`);
          return urlTools;
        }
        return null;
      };
      const earlyReturn = await connectWithTimeout();
      if (earlyReturn) {
        return earlyReturn;
      }
      const toolsResult = await this.mcpClientMap[transportName].listTools();
      toolsResult?.tools?.forEach((v) => {
        if (!transportConfig?.tools || transportConfig.tools.find((item) => item.name === v.name)) {
          urlTools[`${transportConfig.name ? `${transportConfig.name}/` : ""}${v.name}`] = {
            description: v.description,
            parameters: v.inputSchema,
            execute: async (params) => {
              const mcpToolResult = await this.mcpClientMap[transportName].callTool({
                name: v.name,
                arguments: params
              });
              if (typeof transportConfig.executeHook === "function") {
                return await transportConfig.executeHook(mcpToolResult);
              }
              return mcpToolResult;
            }
          };
        }
      });
      if (timeId) {
        clearTimeout(timeId);
      }
      return urlTools;
    } catch (error) {
      console.log(error);
      if (timeId) {
        clearTimeout(timeId);
      }
    }
    return urlTools;
  }
}

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { StructuredTool } from "langchain/tools";
import { z, ZodTypeAny } from "zod";
import * as crypto from 'crypto'

/**
 * 将JSON Schema转换为Zod Schema
 * 用于MCP工具的参数验证
 * @param schema - JSON Schema对象
 * @returns ZodTypeAny - 对应的Zod Schema
 */
function jsonSchemaToZodSchema(schema: any): ZodTypeAny {
  switch (schema.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(jsonSchemaToZodSchema(schema.items));
    case "object":
      const shape: Record<string, ZodTypeAny> = {};
      for (const key in schema.properties) {
        shape[key] = jsonSchemaToZodSchema(schema.properties[key]);
      }
      let obj = z.object(shape);
      if (schema.required) {
        for (const key in shape) {
          if (!schema.required.includes(key)) {
            obj = obj.partial({ [key]: true } as any);
          }
        }
      } else {
        obj = obj.partial();
      }
      return obj;
    default:
      return z.any();
  }
}

/**
 * 将MCP工具适配为LangChain StructuredTool
 * @param mcpTool - MCP工具对象
 * @param mcpClient - MCP客户端实例
 * @returns StructuredTool - LangChain结构化工具
 */
export function mcpToolToStructuredTool(mcpTool: Tool, mcpClient: Client) {
  const zodSchema = jsonSchemaToZodSchema(mcpTool.inputSchema);
  return new (class extends StructuredTool {
    name = mcpTool.name;
    description = mcpTool.description || "";
    schema = zodSchema;
    async _call(input: any) {
      console.log("Calling MCP tool", mcpTool.name, input)
      const result = await mcpClient.callTool({
        name: mcpTool.name,
        arguments: input,
      });
      console.log("MCP tool result ", mcpTool.name, input, result)
      return typeof result === "string" ? result : JSON.stringify(result);
    }
  })();
}

/**
 * 过滤控制台警告信息
 * 减少不必要的日志输出，提升调试体验
 */
export function filterLog() {
  const FILTER_MESSAGES = [
    "already exists in this message chunk",
    "Failed to calculate number of tokens, falling back to",
    "This will become an error in a future version of the SDK.",
  ];

  const oldWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      FILTER_MESSAGES.some((shouldBeFiltered) =>
        args[0]?.includes(shouldBeFiltered)
      )
    ) {
      return;
    }
    return oldWarn(...args);
  };
}

/**
 * LLM拦截器回调类
 * 用于拦截和记录LLM请求信息
 */
class LLMInterceptorCallback extends BaseCallbackHandler {
  name = "LLMInterceptorCallback";
  logSeparator = () => console.log("==========");

  /**
   * 处理LLM开始事件
   * @param llm - LLM实例
   * @param prompts - 提示词数组
   */
  async handleLLMStart(llm: any, prompts: string[]) {
    this.logSeparator();
    console.log("🚀 LLM 请求开始:", llm);
    console.log("发送的 Prompts:", JSON.stringify(prompts, null, 2));
    this.logSeparator();
  }
}

/**
 * 生成随机字符串
 * @param length - 字符串长度
 * @returns string - 随机字符串
 */
export function genRandomStr(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * 安全的JSON解析函数
 * @param jsonString - JSON字符串
 * @param defaultValue - 解析失败时的默认值
 * @returns any - 解析结果或默认值
 */
export function safeJsonParse(jsonString: string, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/** LLM回调处理器实例 */
export const llmCallback = new LLMInterceptorCallback();

/**
 * 获取API密钥
 * @param context - 云函数上下文
 * @returns string - 格式化后的API密钥
 */
export function getApiKey(context: any) {
  const accessToken =
    context?.extendedContext?.accessToken ||
    process.env.CLOUDBASE_API_KEY;
  if (typeof accessToken !== "string") {
    throw new Error("Invalid accessToken");
  }

  return accessToken.replace("Bearer", "").trim();
}

import { ChatDeepSeek } from "@langchain/deepseek";
import { llmCallback } from "./util.js";

/**
 * 创建DeepSeek LLM实例
 * @param envId - 云开发环境ID
 * @param model - 模型名称
 * @param apiKey - API密钥
 * @returns ChatDeepSeek - 配置好的LLM实例
 */
export const createDeepseek = (envId: string, model: string, apiKey: string) => {
  return new ChatDeepSeek({
    streaming: true,
    model: model,
    apiKey: apiKey,
    configuration: {
      baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
    },
    callbacks: [llmCallback],
  });
}
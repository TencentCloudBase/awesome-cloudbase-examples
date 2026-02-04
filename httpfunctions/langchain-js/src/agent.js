import { createAgent as createLangchainAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { clientTools } from "@cloudbase/agent-adapter-langchain";

// MemorySaver: 内存级对话历史存储，支持多轮对话上下文
// 生产环境可替换为持久化存储（如数据库）
const checkpointer = new MemorySaver();

/**
 * 创建 LangChain Agent 实例
 * 这是底层的 Agent 逻辑，负责：
 * - 与大模型交互
 * - 管理对话历史
 * - 处理工具调用
 */
export function createAgent() {
  // 配置 OpenAI 兼容的大模型
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
      defaultHeaders: {
        Accept: "text/event-stream",
      },
    },
  });

  return createLangchainAgent({
    model,
    checkpointer,
    // clientTools(): 允许客户端动态传入工具，Agent 可调用这些工具完成任务
    middleware: [clientTools()],
    systemPrompt:
      "你是一位精通云开发 CloudBase 的专家，擅长回答任何相关的问题。",
  });
}

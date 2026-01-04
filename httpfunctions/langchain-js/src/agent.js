import { createAgent as createLangchainAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { clientTools } from "@cloudbase/agent-adapter-langchain";

const checkpointer = new MemorySaver();

export function createAgent() {
  // Configure model
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });

  // Create agent
  return createLangchainAgent({
    model,
    checkpointer,
    middleware: [clientTools()],
    systemPrompt:
      "你是一位精通云开发 CloudBase 的专家，擅长回答任何相关的问题。",
  });
}

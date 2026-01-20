import { createExpressRoutes } from "@cloudbase/agent-server";
import { LangchainAgent } from "@cloudbase/agent-adapter-langchain";
import { createAgent as createLangchainAgent } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import { checkOpenAIEnvMiddleware } from "./utils.js";

// 加载 .env 文件中的环境变量
dotenvx.config();

/**
 * 创建 AG-UI 兼容的 Agent
 *
 * 这里有两层封装：
 * 1. createLangchainAgent() - 底层 LangChain Agent，处理 LLM 对话逻辑
 * 2. LangchainAgent - 适配器，将 LangChain 转换为 AG-UI 协议格式
 *
 * AG-UI 协议: https://docs.cloudbase.net/ai/agent-development/protocol
 */
function createAgent() {
  const lcAgent = createLangchainAgent();
  return {
    agent: new LangchainAgent({
      agent: lcAgent,
    }),
  };
}

const app = express();
app.use(cors());
app.use(checkOpenAIEnvMiddleware);

// 注册 AG-UI 协议路由，自动处理 SSE 流式响应、工具调用等
createExpressRoutes({
  createAgent,
  express: app,
});

app.listen(9000, () => console.log("Listening on 9000!"));

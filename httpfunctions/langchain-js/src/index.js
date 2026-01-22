import { createExpressRoutes } from "@cloudbase/agent-server";
import { LangchainAgent } from "@cloudbase/agent-adapter-langchain";
import { createAgent as createLangchainAgent } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import pino from "pino";
import { checkOpenAIEnvMiddleware } from "./utils.js";

// 加载 .env 文件中的环境变量
dotenvx.config();

/**
 * 创建 Logger 实例
 *
 * 可以使用任何符合 Logger 接口的日志库，例如：
 * - pino: pino({ level: "info" })
 * - winston: winston.createLogger()
 * - console: 直接传入 console
 * - 自定义: 只需实现 info/warn/error 等方法
 *
 * Logger 接口定义见: import("@cloudbase/agent-server").Logger
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

/**
 * 创建 AG-UI 兼容的 Agent
 *
 * 这里有两层封装：
 * 1. createLangchainAgent() - 底层 LangChain Agent，处理 LLM 对话逻辑
 * 2. LangchainAgent - 适配器，将 LangChain 转换为 AG-UI 协议格式
 *
 * AG-UI 协议: https://docs.cloudbase.net/ai/agent-development/protocol
 *
 * context 包含以下属性：
 * - request: 当前 HTTP 请求（Web Standard Request）
 * - logger: 日志实例（带 requestId 上下文）
 * - requestId: 请求追踪 ID
 *
 * @type {import("@cloudbase/agent-server").AgentCreator}
 */
const createAgent = ({ request, logger, requestId }) => {
  // 可以根据 context 实现按请求动态配置，例如：
  // - 从 request 获取用户信息
  // - 根据不同用户使用不同的模型配置
  // - 使用 logger 记录请求日志
  // - 使用 requestId 追踪请求链路

  const lcAgent = createLangchainAgent();
  return {
    agent: new LangchainAgent({
      agent: lcAgent,
    }),
  };
};

const app = express();
app.use(cors());
app.use(checkOpenAIEnvMiddleware);

// 注册 AG-UI 协议路由，自动处理 SSE 流式响应、工具调用等
createExpressRoutes({
  createAgent,
  express: app,
  logger,
});

app.listen(9000, () => logger.info("Listening on 9000!"));

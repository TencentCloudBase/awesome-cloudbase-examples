import { createExpressRoutes } from "@cloudbase/agent-server";
import { LanggraphAgent } from "@cloudbase/agent-adapter-langgraph";
import { createAgenticChatGraph } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { checkOpenAIEnvMiddleware, parseJwtFromRequest } from "./utils.js";

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
 * Logger 接口定义见: import("@cloudbase/agent-shared").Logger
 */
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ err: reason, promise }, "Unhandled promise rejection caught");
});

/**
 * 创建 AG-UI 兼容的 Agent
 *
 * 这里有两层封装：
 * 1. createAgenticChatGraph() - 底层 LangGraph 工作流，处理 LLM 对话逻辑
 * 2. LanggraphAgent - 适配器，将 LangGraph 转换为 AG-UI 协议格式
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

  const agenticChatGraph = createAgenticChatGraph();
  return {
    agent: new LanggraphAgent({
      compiledWorkflow: agenticChatGraph,
    })
      .use((input, next) => {
        // 使用 AG-UI TypeScript SDK 的 middleware 机制
        // 确保每个请求都有 threadId，用于会话追踪
        // 如果客户端未提供 threadId，则自动生成一个 UUID
        return next.run(
          typeof input.threadId === "string"
            ? input
            : { ...input, threadId: uuidv4() },
        );
      })
      .use((input, next) => {
        // 将请求上下文注入到 Agent 状态中，供后续处理使用
        // - user: 从 Authorization header 解析 JWT 获取用户信息
        //         包含 id (sub)、exp、iat 等 JWT 标准字段
        //         如果未携带有效 JWT 则为 null
        // - req: 原始 Web Request 对象，可用于获取其他请求信息
        return next.run({
          ...input,
          state: {
            ...(input.state || {}),
            __request_context__: {
              user: parseJwtFromRequest(request),
              req: request,
            },
          },
        });
      }),
  };
};

const app = express();

// 仅在 ENABLE_CORS=true 时启用 CORS
if (process.env.ENABLE_CORS === "true") {
  app.use(cors());
}

app.use(checkOpenAIEnvMiddleware);

// 注册 AG-UI 协议路由，自动处理 SSE 流式响应、工具调用等
createExpressRoutes({
  createAgent,
  express: app,
  logger,
});

app.listen(9000, () => logger.info("Listening on 9000!"));

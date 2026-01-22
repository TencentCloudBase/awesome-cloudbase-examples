import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { createAgent } from "./agent.js";
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
 * 应用入口
 *
 * 本项目使用 LangGraph StateGraph 构建 Agent 工作流：
 * 1. createAgent() - 创建 LangGraph 工作流并包装为 AG-UI 兼容的 Agent
 * 2. createExpressRoutes() - 注册 AG-UI 协议路由，处理 SSE 流式响应
 *
 * AG-UI 协议: https://docs.cloudbase.net/ai/agent-development/protocol
 */

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

import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { LLMAgent } from "@cloudbase/agent-adapter-llm";
import dotenvx from "@dotenvx/dotenvx";
import OpenAI from "openai";
// import cors from "cors";
import { DetectCloudbaseUserMiddleware } from "./utils.js";

dotenvx.config();

function createAgent({ request }) {
  const agent = new LLMAgent({
    model: new OpenAI({
      apiKey: process.env.OPENCLAW_GATEWAY_TOKEN || "",
      baseURL: process.env.OPENCLAW_BASE_URL || "",
    }),
    modelName: `openclaw:${process.env.OPENCLAW_AGENT_ID || "main"}`,
  });
  // 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}

const app = express();

// 调试若遇 CORS 问题可启用 CORS 中间件
// app.use(
//   cors({
//     origin: true,
//   }),
// );

// 创建标准路由：/send-message, /chat/completions, /healthz 等
createExpressRoutes({
  createAgent,
  express: app,
});

app.listen(9000, () => console.log("Listening on 9000!"));


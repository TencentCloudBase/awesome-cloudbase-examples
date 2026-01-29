import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { YuanqiAgent } from "@cloudbase/agent-adapter-yuanqi";
import dotenvx from "@dotenvx/dotenvx";
// import cors from "cors";
import { DetectCloudbaseUserMiddleware } from "./utils.js";

dotenvx.config();

// 自定义 Agent 类，支持从客户端的 forwardedProps 中提取额外参数
class MyAgent extends YuanqiAgent {
  generateRequestBody({ messages, input }) {
    const { forwardedProps } = input;
    // 调用父类方法生成基础请求体
    const req = super.generateRequestBody({
      messages,
      input,
    });
    // 可以在这里对 messages 进行处理
    req.messages = messages || [];
    // 或者从 forwardedProps 中提取额外参数
    req.customVariables = forwardedProps?.myVariable || {};
    return req;
  }
}

function createAgent({ request }) {
  // 元器 Token 体验活动 - 云开发身份认证
  const accessToken = request.headers.get("Authorization")?.split(" ")[1] || "";
  const headers = {};
  if (accessToken) {
    headers["X-Source"] = "cloudbase";
    headers["X-Token"] = accessToken;
  }
  // 创建元器 Agent 实例
  const agent = new MyAgent({
    yuanqiConfig: {
      appId: process.env.YUANQI_APP_ID || "",
      appKey: process.env.YUANQI_APP_KEY || "",
      request: {
        headers: {
          ...headers,
        },
      },
    },
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

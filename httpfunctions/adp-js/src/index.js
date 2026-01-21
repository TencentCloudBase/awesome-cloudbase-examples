import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { AdpAgent } from "@cloudbase/agent-adapter-adp";
import dotenvx from "@dotenvx/dotenvx";
// import cors from "cors";
import { detectCloudbaseUserMiddleware } from "./utils.js";

dotenvx.config();

// 自定义 Agent 类，支持从客户端的 forwardedProps 中提取额外参数到 ADP
class MyAgent extends AdpAgent {
  generateRequestBody({ message, fileInfos, runId, threadId, forwardedProps }) {
    // 调用父类方法生成基础请求体
    const req = super.generateRequestBody({
      message,
      fileInfos,
      runId,
      threadId,
      forwardedProps,
    });
    // 从客户端传递的参数中提取 modelName
    req.modelName = forwardedProps.modelName || "";
    return req;
  }
}

function createAgent() {
  const agent = new MyAgent({
    adpConfig: {
      appKey: process.env.ADP_APP_KEY || "",
      credential: {
        // 从环境变量中获取腾讯云用户认证信息
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
        token: process.env.TENCENTCLOUD_SESSIONTOKEN || "",
      },
    },
  });
  return { agent };
}

const app = express();

// app.use(
//   cors({
//     origin: true,
//   }),
// );
app.use(express.json());
// 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
app.use(detectCloudbaseUserMiddleware);

// 创建标准路由：/send-message, /chat/completions, /healthz 等
createExpressRoutes({
  createAgent,
  express: app,
});

app.listen(9000, () => console.log("Listening on 9000!"));

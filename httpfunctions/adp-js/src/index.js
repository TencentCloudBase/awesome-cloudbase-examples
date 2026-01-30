import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { AdpAgent } from "@cloudbase/agent-adapter-adp";
import dotenvx from "@dotenvx/dotenvx";
// import cors from "cors";
import { DetectCloudbaseUserMiddleware } from "./utils.js";

dotenvx.config();

// 自定义 Agent 类，支持从客户端的 forwardedProps 中提取额外参数到 ADP
class MyAgent extends AdpAgent {
  generateRequestBody({ message, fileInfos, input }) {
    const { forwardedProps } = input;
    // 调用父类方法生成基础请求体
    const req = super.generateRequestBody({
      message,
      fileInfos,
      input,
    });
    // 从客户端传递的参数中提取 modelName
    req.modelName = forwardedProps.modelName || "";
    return req;
  }
}

function createAgent({ request }) {
  const agent = new MyAgent({
    adpConfig: {
      appKey: process.env.ADP_APP_KEY || "",
      credential: {
        // 方法 1/1+2 二选一，云函数环境下已自动注入，无需手动配置
        // 1. 从环境变量中获取腾讯云用户认证信息
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
        // 2. 获取临时密钥 sessionToken（https://cloud.tencent.com/document/product/1312/48197）
        token: process.env.TENCENTCLOUD_SESSIONTOKEN || "",
      },
      // 仅当配置了 credential 后才可开启文件/图片上传功能
      enableUpload: false,
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

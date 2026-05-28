import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import {
  YuanqiAgent,
  ChatMessage,
  YuanqiChatRequest,
} from "@cloudbase/agent-adapter-yuanqi";
import { BaseEvent, Message, RunAgentInput } from "@ag-ui/client";
import dotenvx from "@dotenvx/dotenvx";
// import cors from "cors";
import { DetectCloudbaseUserMiddleware } from "./utils.js";
import { Subscriber } from "rxjs";
import {
  WeChatAgent,
  createWxMessageHandler,
  WeChatHistoryManager,
  WeChatSendMode,
} from "@cloudbase/agent-adapter-wx";

dotenvx.config();

// 自定义 Agent 类，支持从客户端的 forwardedProps 中提取额外参数
class MyAgent extends YuanqiAgent {
  generateRequestBody({
    messages,
    input,
  }: {
    messages: ChatMessage[];
    input: RunAgentInput;
  }): YuanqiChatRequest {
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

  // 重写父类方法，获取历史对话
  protected async getChatHistory(
    subscriber: Subscriber<BaseEvent>,
    input: RunAgentInput,
    latestUserMessage: Message,
  ) {
    // 调用父类方法获取历史对话
    const history = await super.getChatHistory(
      subscriber,
      input,
      latestUserMessage,
    );
    // 也可以忽略父类方法，自行处理历史对话的获取逻辑
    // const history = await myMethodToGetChatHistory(subscriber, input, latestUserMessage);
    // 可以在这里对历史对话进行处理
    return history;
  }

  // 重写父类方法，保存历史对话
  // protected async saveChatHistory(
  //   subscriber: Subscriber<BaseEvent>,
  //   input: RunAgentInput,
  //   userRecordId: string,
  //   assistantRecordId: string,
  //   userContent: string,
  //   assistantContent: string,
  // ) {}
}

function createAgent({ request }: { request: Request }) {
  // 元器 Token 体验活动 - 云开发身份认证
  const Authorization =
    (request.headers as any).Authorization ||
    request.headers.get("Authorization");
  const accessToken = Authorization?.split(" ")[1] || "";
  const headers: Record<string, string> = {};
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
      // 云开发环境 ID，用于云开发身份认证
      envId: process.env.CLOUDBASE_ENV_ID || "",
      credential: {
        // 方法 1/1+2 二选一，云函数环境下已自动注入，无需手动配置
        // 1. 从环境变量中获取腾讯云用户认证信息
        secretId: process.env.TENCENTCLOUD_SECRETID || "",
        secretKey: process.env.TENCENTCLOUD_SECRETKEY || "",
        // 2. 获取临时密钥 sessionToken（https://cloud.tencent.com/document/product/1312/48197）
        token: process.env.TENCENTCLOUD_SESSIONTOKEN || "",
      },
      // 可以自行增减历史对话轮数
      historyCount: 20,
    },
  });
  // 该中间件从请求头 Authorization 中的 JWT 提取用户 ID
  agent.use(new DetectCloudbaseUserMiddleware(request));
  return { agent };
}

/**
 * Create WeChat Agent Adapter that wraps Yuanqi agent
 */
function createWxAgent({
  request,
  options,
}: {
  request: any;
  options?: { agentId?: string };
}) {
  const { agent: baseAgent } = createAgent({ request });
  const envId = process.env.TCB_ENV || process.env.ENV_ID;

  return {
    agent: new WeChatAgent({
      agentId: options?.agentId || "agent-wx",
      agent: baseAgent,
      wechatConfig: {
        sendMode: WeChatSendMode.AITOOLS,
        context: {
          extendedContext: {
            envId,
            accessToken: request.headers.get("authorization") || undefined,
          },
        },
      } as any,
      // @ts-ignore
      historyManager: new WeChatHistoryManager({
        envId,
      }),
    }),
  };
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

// Register WeChat message route
app.post(
  "/wx-send-message",
  express.json(),
  createWxMessageHandler(createWxAgent),
);
app.post(
  "/v1/aibot/bots/:agentId/wx-send-message",
  express.json(),
  createWxMessageHandler(createWxAgent),
);

app.listen(9000, () => console.log("Listening on 9000!"));

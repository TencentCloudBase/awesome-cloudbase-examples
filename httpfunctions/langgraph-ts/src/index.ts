import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { createAgent } from "./agent.js";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import { checkOpenAIEnvMiddleware } from "./utils.js";
import { WeChatAgent, createWxMessageHandler, WeChatHistoryManager, WeChatSendMode } from '@cloudbase/agent-adapter-wx';

dotenvx.config();

/**
 * Create WeChat Agent Adapter that wraps LangGraph agent
 */
function createWxAgent({ request, options }: { request: any; options?: { agentId?: string } }) {
  const { agent: baseAgent } = createAgent();
  const envId = process.env.TCB_ENV || process.env.ENV_ID;

  return {
    agent: new WeChatAgent({
      agentId: options?.agentId || 'agent-wx',
      agent: baseAgent,
      wechatConfig: {
        sendMode: WeChatSendMode.AITOOLS,
        context: {
          extendedContext: {
            envId,
            accessToken: request.headers.get('authorization') || undefined,
          }
        }
      } as any,
      // @ts-ignore
      historyManager: new WeChatHistoryManager({
        envId,
      })
    })
  };
}

const app = express();

app.use(cors());

app.use(checkOpenAIEnvMiddleware);

createExpressRoutes({
  createAgent,
  express: app,
});

// Register WeChat message route
app.post('/wx-send-message', express.json(), createWxMessageHandler(createWxAgent));
app.post('/v1/aibot/bots/:agentId/wx-send-message', express.json(), createWxMessageHandler(createWxAgent));

app.listen(9000, () => console.log("Listening on 9000!"));

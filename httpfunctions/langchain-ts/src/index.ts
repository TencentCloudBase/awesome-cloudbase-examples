import { createExpressRoutes } from "@cloudbase/agent-server";
import { LangchainAgent } from "@cloudbase/agent-adapter-langchain";
import { createAgent as createLangchainAgent } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import { checkOpenAIEnvMiddleware } from "./utils.js";
import { WeChatAgent, createWxMessageHandler, WeChatHistoryManager, WeChatSendMode } from '@cloudbase/agent-adapter-wx';

dotenvx.config();

function createAgent({ request }: { request?: Request } = {}) {
  const lcAgent = createLangchainAgent();

  return {
    agent: new LangchainAgent({
      agent: lcAgent,
    }),
  };
}

/**
 * Create WeChat Agent Adapter that wraps LangChain agent
 */
function createWxAgent({ request, options }: { request: any; options?: { agentId?: string } }) {
  const { agent: baseAgent } = createAgent({ request });
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

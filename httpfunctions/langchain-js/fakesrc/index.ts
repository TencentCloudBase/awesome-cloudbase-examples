import { createExpressRoutes } from "@cloudbase/agent-server";
import { LangchainAgent } from "@cloudbase/agent-adapter-langchain";
import { createAgent as createLangchainAgent } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import { checkOpenAIEnvMiddleware } from "./utils.js";

dotenvx.config();

function createAgent() {
  const lcAgent = createLangchainAgent();

  return {
    agent: new LangchainAgent({
      agent: lcAgent,
    }),
  };
}

const app = express();

app.use(cors());

app.use(checkOpenAIEnvMiddleware);

createExpressRoutes({
  createAgent,
  express: app,
});

app.listen(9000, () => console.log("Listening on 9000!"));

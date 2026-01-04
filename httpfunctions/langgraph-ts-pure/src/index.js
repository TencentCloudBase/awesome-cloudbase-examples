import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import { createAgent } from "./agent.js";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import { checkOpenAIEnvMiddleware } from "./utils.js";
dotenvx.config();
const app = express();
app.use(cors());
app.use(checkOpenAIEnvMiddleware);
createExpressRoutes({
    createAgent,
    express: app,
});
app.listen(9000, () => console.log("Listening on 9000!"));

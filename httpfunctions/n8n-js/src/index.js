import { createExpressRoutes } from "@cloudbase/agent-server";
import { createAgent } from "./agent.js";
import express from "express";
import cors from "cors";
import dotenvx from "@dotenvx/dotenvx";
import pino from "pino";
import { ExporterType } from "@cloudbase/agent-observability/server";

dotenvx.config();

const isObservabilityEnabled = () => {
  const value = process.env.AUTO_TRACES_STDOUT?.toLowerCase();
  return value !== "false" && value !== "0";
};

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ err: reason, promise }, "Unhandled promise rejection caught");
});

const app = express();

if (process.env.ENABLE_CORS === "true") {
  app.use(cors());
}

createExpressRoutes({
  createAgent,
  express: app,
  logger,
  observability: isObservabilityEnabled()
    ? { type: ExporterType.Console }
    : undefined,
});

app.listen(9000, () => logger.info("Server listening on port 9000!"));

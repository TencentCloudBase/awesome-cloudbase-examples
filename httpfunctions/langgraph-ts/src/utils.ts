import { NextFunction, Request, Response } from "express";

export function checkOpenAIEnvMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  const missingVars: string[] = [];

  if (!process.env.OPENAI_MODEL) {
    missingVars.push("OPENAI_MODEL");
  }
  if (!process.env.OPENAI_API_KEY) {
    missingVars.push("OPENAI_API_KEY");
  }
  if (!process.env.OPENAI_BASE_URL) {
    missingVars.push("OPENAI_BASE_URL");
  }

  if (missingVars.length > 0) {
    res.status(503).json({
      error: "Service Unavailable",
      message: `Missing required environment variables: ${missingVars.join(", ")}`,
      code: "MISSING_ENV_CONFIG",
    });
    return;
  }

  next();
}

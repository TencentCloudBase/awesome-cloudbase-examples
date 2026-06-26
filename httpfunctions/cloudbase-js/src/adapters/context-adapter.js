"use strict";
import { getEnvConfig } from "../config/env.js";
import { randomId } from "../utils/helpers.js";
export function getRequestContext(state) {
  const ctx = state?.__request_context__;
  return ctx || null;
}
export function createCloudbaseContext(requestContext, options) {
  const envConfig = getEnvConfig();
  const userId = options?.userId || requestContext?.user?.id || "anonymous";
  const ctxId = options?.ctxId || randomId(16);
  let httpContext;
  if (requestContext?.request) {
    const req = requestContext.request;
    httpContext = {
      url: req.url || "",
      httpMethod: req.method || "POST",
      headers: {}
    };
    if (req.headers) {
      req.headers.forEach((value, key) => {
        httpContext.headers[key] = value;
      });
    }
  }
  return {
    ctxId,
    httpContext,
    extendedContext: {
      envId: envConfig.envId,
      userId,
      accessToken: envConfig.apiKey
    }
  };
}

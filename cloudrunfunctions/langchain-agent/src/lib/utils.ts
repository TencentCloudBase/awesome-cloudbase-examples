import * as crypto from 'crypto'
import { ChatDeepSeek } from "@langchain/deepseek";


export function genRandomStr(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function safeJsonParse(jsonString: string, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

export function getApiKey(context: any) {
  const accessToken =
    context?.extendedContext?.accessToken ||
    process.env.CLOUDBASE_API_KEY;
  if (typeof accessToken !== "string") {
    throw new Error("Invalid accessToken");
  }

  return accessToken.replace("Bearer", "").trim();
}

async function wrapResult<T>(
  fn: () => T
): Promise<
  { success: true; data: Awaited<T> } | { success: false; error: unknown }
> {
  try {
    const data = await Promise.resolve(fn());
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}

export async function logIfError<T>(fn: () => T, log: (error: unknown) => void) {
  const result = await wrapResult(fn);
  if (result.success) {
    return result.data;
  } else {
    log(result.error)
    throw result.error
  }
}

export const createDeepseek = (envId: string, model: string, apiKey: string) => {
  return logIfError(
    () =>
      new ChatDeepSeek({
        streaming: false,
        model: model,
        apiKey: apiKey,
        configuration: {
          baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
        },
      }),
    (e) => console.error(`create deepseek failed`, e)
  );
}
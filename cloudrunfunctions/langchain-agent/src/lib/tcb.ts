
import { ContextInjected, TcbExtendedContext } from '@cloudbase/functions-typings';
export type TcbContext = ContextInjected<TcbExtendedContext>;

export function getEnvId(context: TcbContext): string {
  return context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID || '';
}

/**
 * Gets the OpenAPI base URL for the current TCB environment.
 * @param context - The TCB context containing environment information
 * @returns The formatted base URL string in format: `https://{envId}.api.tcloudbasegateway.com`
 */
export function getOpenAPIBaseURL(context: TcbContext): string {
  return `https://${getEnvId(context)}.api.tcloudbasegateway.com`;
}

export function getAccessToken(context: TcbContext) {
  const accessToken =
    context?.extendedContext?.serviceAccessToken || context?.extendedContext?.accessToken || process.env.CLOUDBASE_API_KEY;
  if (typeof accessToken !== 'string') {
    throw new Error('Invalid accessToken');
  }

  return accessToken.replace('Bearer', '').trim();
}

export function checkIsInCBR() {
  // CBR = CLOUDBASE_RUN
  return !!process.env.CBR_ENV_ID;
}

import { ContextInjected, TcbExtendedContext } from '@cloudbase/functions-typings';

/** 云开发上下文类型 */
export type TcbContext = ContextInjected<TcbExtendedContext>;

/**
 * 获取云开发环境ID
 * @param context - 云开发上下文
 * @returns string - 环境ID
 */
export function getEnvId(context: TcbContext): string {
  return context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID || '';
}

/**
 * 获取云开发OpenAPI基础URL
 * @param context - 云开发上下文
 * @returns string - 格式化的基础URL
 */
export function getOpenAPIBaseURL(context: TcbContext): string {
  return `https://${getEnvId(context)}.api.tcloudbasegateway.com`;
}

/**
 * 获取访问令牌
 * @param context - 云开发上下文
 * @returns string - 访问令牌
 */
export function getAccessToken(context: TcbContext) {
  const accessToken =
    context?.extendedContext?.serviceAccessToken || context?.extendedContext?.accessToken || process.env.CLOUDBASE_API_KEY;
  if (typeof accessToken !== 'string') {
    throw new Error('Invalid accessToken');
  }

  return accessToken.replace('Bearer', '').trim();
}

/**
 * 检查是否在云托管环境中运行
 * @returns boolean - 是否在云托管环境
 */
export function checkIsInCBR() {
  // CBR = CLOUDBASE_RUN
  return !!process.env.CBR_ENV_ID;
}
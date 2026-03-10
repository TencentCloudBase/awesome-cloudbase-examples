/**
 * 环境变量配置
 * 所有配置从环境变量读取，不再依赖 TcbContext
 * 
 * 环境 ID 获取优先级（与 AG-Kit adapter-yuanqi 保持一致）：
 * 1. CBR_ENV_ID - 云托管环境自动注入
 * 2. SCF_NAMESPACE - 云函数环境自动注入
 * 3. CLOUDBASE_ENV_ID - 通用配置
 */

export interface EnvConfig {
  // 云开发环境 ID
  envId: string
  // 云开发 API Key
  apiKey: string
}

/**
 * 获取云开发环境 ID
 * 优先级：CBR_ENV_ID > SCF_NAMESPACE > CLOUDBASE_ENV_ID
 */
function getCloudbaseEnvId(): string {
  if (process.env.CBR_ENV_ID) {
    return process.env.CBR_ENV_ID
  } else if (process.env.SCF_NAMESPACE) {
    return process.env.SCF_NAMESPACE
  } else {
    return process.env.CLOUDBASE_ENV_ID || ''
  }
}

/**
 * 获取环境 ID（getCloudbaseEnvId 的别名，保持向后兼容）
 */
export function getEnvId(): string {
  return getCloudbaseEnvId()
}

/**
 * 获取环境配置
 */
export function getEnvConfig(): EnvConfig {
  return {
    envId: getCloudbaseEnvId(),
    apiKey: process.env.CLOUDBASE_APIKEY || '',
  }
}

/**
 * 获取 API Key
 */
export function getApiKey(): string {
  const apiKey = process.env.CLOUDBASE_APIKEY || ''
  return apiKey.replace('Bearer', '').trim()
}

/**
 * 获取 OpenAPI 基础 URL
 */
export function getOpenAPIBaseURL(): string {
  const envId = getCloudbaseEnvId()
  return `https://${envId}.api.tcloudbasegateway.com`
}



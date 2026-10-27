// tcb
export const TRIGGER_SRC_TCB = 'TCB'

// 智能体类型 text
export const BOT_TYPE_TEXT = 'text'

// 用户角色
export const BOT_ROLE_USER = 'user'
// 智能体角色
export const BOT_ROLE_ASSISTANT = 'assistant'

// 查询的历史对话条数
export const HISTORY_PAGE_SIZE = 10

// 对话数据模型
export const CHAT_HISTORY_DATA_SOURCE = 'ai_bot_chat_history_5hobd2b'

// 会话数据模型
export const CONVERSATION_RELATION_DATA_SOURCE = 'conversation_relation_5hobd2b'

export const DEFAULT_CONVERSATION_TITLE = '新会话'

// 微信订阅号
export const TRIGGER_SRC_WX_SUBSCRIPTION = 'WXSubscription'
// 微信服务号
export const TRIGGER_SRC_WX_SERVICE = 'WXService'
// 微信小程序
export const TRIGGER_SRC_WX_MINI_APP = 'WXMiniapp'
// 企业微信客服
export const TRIGGER_SRC_WX_CUSTOM_SERVICE = 'WXCustomerService'

// 微信回调消息类型 text
export const MSG_TYPE_TEXT = 'text'

// 微信回调语音消息类型
export const MSG_TYPE_VOICE = 'voice'

// ==================== LLM 错误码 ====================

/**
 * 触发 HUNYUAN rateLimit
 */
export const HUNYUAN_RATE_LIMT_FAILED_CODE = 'HUNYUAN_RATE_LIMIT_FAILED'

export const HUNYUAN_GENERATE_FAILED = 'HUNYUAN_GENERATE_FAILED'

export const LLM_CONTENT_FILER = 'LLM_CONTENT_FILER'

/**
 * 请求聊天大模型失败
 */
export const REQUEST_LLM_ERROR_CODE = 'REQUEST_LLM_ERROR'

export const REQUEST_LLM_ERROR_MESSAGE = '调用大模型失败，请稍后重试'

/**
 * LLM TOKEN 超限
 */
export const REQUEST_LLM_TOKEN_COUNT_EXCEED = 'REQUEST_LLM_TOKEN_COUNT_EXCEED'

/**
 * 大模型请求超限
 */
export const EXCEED_CONCURRENT_REQUEST_LIMIT = 'EXCEED_CONCURRENT_REQUEST_LIMIT'

export const EXCEED_CONCURRENT_REQUEST_LIMIT_MESSAGE = '请求大模型并发超限，请稍后重试'

/**
 * 大模型 token 额度超限
 */
export const EXCEED_TOKEN_QUOTA_LIMIT = 'EXCEED_TOKEN_QUOTA_LIMIT'

export const EXCEED_TOKEN_QUOTA_LIMIT_MESSAGE =
  '大模型 Token 已耗尽，请通知开发者前往云开发平台进行处理。https://tcb.cloud.tencent.com/dev#/ai'

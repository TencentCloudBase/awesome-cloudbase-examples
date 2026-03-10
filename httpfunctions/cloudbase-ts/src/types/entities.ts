/**
 * 聊天历史数据库原始数据格式
 */
export interface ChatHistoryData {
  bot_id: string
  record_id: string
  role: string
  status: string
  content: string
  sender: string
  conversation: string
  type: string
  trigger_src: string
  origin_msg: string
  reply_to: string
  reply: string
  trace_id: string
  need_async_reply: boolean
  async_reply: string
  createdAt: number
  updatedAt: number
}

/**
 * 聊天历史实体类
 */
export class ChatHistoryEntity {
  id: number = 0
  botId: string = ''
  // 对话唯一id
  recordId: string = ''
  role: string = ''
  content: string = ''
  recommendQuestions: string[] = []
  sender: string = ''
  conversation: string = ''
  type: string = ''
  /**
   * 消息状态，pending done error cancel
   */
  status: string = ''
  image: string = ''
  triggerSrc: string = ''
  originMsg: string = ''
  replyTo: string = ''
  reply: string = ''
  traceId: string = ''
  needAsyncReply: boolean = false
  asyncReply: string = ''
  createTime: string = ''
  updateTime: string = ''
  createdAt: number = 0
  updatedAt: number = 0
  event: string = ''
}

/**
 * 文件信息
 */
export interface FileInfo {
  cloudId: string
  fileName: string
  bytes: number
  type: string
}

/**
 * 会话关系数据库原始数据格式
 */
export interface ConversationRelationData {
  bot_id: string
  user_id: string
  conversation_id: string
  title: string
  createdAt: number
  updatedAt: number
}

/**
 * 会话关系实体类
 */
export class ConversationRelationEntity {
  botId: string = ''
  userId: string = ''
  conversationId: string = ''
  title: string = ''
  createdAt?: number
  updatedAt?: number
}

/**
 * 语音转文字输入参数
 */
export interface SpeechToTextInput {
  engSerViceType: string
  voiceFormat: string
  url: string
}

/**
 * 语音转文字结果
 */
export interface SpeechToTextResult {
  code?: string
  message?: string
  result: string
}

/**
 * 文字转语音输入参数
 */
export interface TextToSpeechInput {
  text: string
  voiceType: number
}

/**
 * 文字转语音结果
 */
export interface TextToSpeechResult {
  code?: string
  message?: string
  taskId?: string
}

/**
 * 获取文字转语音结果输入参数
 */
export interface GetTextToSpeechResultInput {
  taskId: string
}

/**
 * 获取文字转语音结果
 */
export interface GetTextToSpeechResult {
  code?: string
  message?: string
  taskId: string
  status: number
  statusStr: string
  resultUrl: string
}

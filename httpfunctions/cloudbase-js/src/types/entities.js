"use strict";
export class ChatHistoryEntity {
  id = 0;
  botId = "";
  // 对话唯一id
  recordId = "";
  role = "";
  content = "";
  recommendQuestions = [];
  sender = "";
  conversation = "";
  type = "";
  /**
   * 消息状态，pending done error cancel
   */
  status = "";
  image = "";
  triggerSrc = "";
  originMsg = "";
  replyTo = "";
  reply = "";
  traceId = "";
  needAsyncReply = false;
  asyncReply = "";
  createTime = "";
  updateTime = "";
  createdAt = 0;
  updatedAt = 0;
  event = "";
}
export class ConversationRelationEntity {
  botId = "";
  userId = "";
  conversationId = "";
  title = "";
  createdAt;
  updatedAt;
}

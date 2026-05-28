"use strict";
import { ChatContextService } from "./chat_context.service.js";
import { ChatHistoryService } from "./chat_history.service.js";
import {
  BOT_ROLE_ASSISTANT,
  BOT_ROLE_USER,
  BOT_TYPE_TEXT,
  TRIGGER_SRC_TCB
} from "../utils/constants.js";
import { LLMCommunicator } from "../llm/llm_communicator.js";
import { getEnvId } from "../config/env.js";
import { ChatHistoryEntity } from "../types/entities.js";
import { getFileInfo } from "../utils/tcb.js";
import { ConversationRelationService } from "./conversation_relation.service.js";
import { EventType } from "@ag-ui/client";
export class MainChatService {
  botContext;
  chatContextService;
  chatHistoryService;
  conversationRelationService;
  sseSender;
  constructor(botContext, sseSender) {
    this.botContext = botContext;
    this.sseSender = sseSender;
    this.chatContextService = new ChatContextService(botContext);
    this.chatHistoryService = new ChatHistoryService(botContext);
    this.conversationRelationService = new ConversationRelationService(botContext);
  }
  async beforeStream({
    msg,
    files,
    conversationId
  }) {
    try {
      const userId = this.botContext.context?.extendedContext?.userId || getEnvId();
      const conversation = conversationId || userId;
      const baseMsgData = {
        sender: userId,
        type: this.botContext.info?.type ?? BOT_TYPE_TEXT,
        triggerSrc: TRIGGER_SRC_TCB,
        botId: this.botContext.info.botId,
        recommendQuestions: [],
        asyncReply: "",
        image: "",
        conversation
      };
      const replyRecordId = await this.chatHistoryService.genRecordId();
      const originFileInfos = await getFileInfo(files);
      const originMsg = { fileInfos: originFileInfos };
      const msgData = {
        ...new ChatHistoryEntity(),
        ...baseMsgData,
        recordId: await this.chatHistoryService.genRecordId(),
        role: BOT_ROLE_USER,
        content: msg,
        originMsg: JSON.stringify(originMsg),
        reply: replyRecordId
      };
      const replyMsgData = {
        ...new ChatHistoryEntity(),
        ...baseMsgData,
        recordId: replyRecordId,
        role: BOT_ROLE_ASSISTANT,
        content: "",
        originMsg: JSON.stringify({}),
        reply: replyRecordId,
        needAsyncReply: false
      };
      await this.chatHistoryService.createChatHistory({
        chatHistoryEntity: msgData
      });
      await this.chatHistoryService.createChatHistory({
        chatHistoryEntity: replyMsgData
      });
      return { replyRecordId, conversationId: conversation };
    } catch (error) {
      console.log("beforeStream err:", error);
      return { replyRecordId: "", conversationId: "" };
    }
  }
  async afterStream({
    error,
    needSave,
    callMsg,
    chunks,
    recordId = "",
    conversationId = "",
    userMessage = ""
  }) {
    if (error) {
      console.log("请求大模型错误:", error);
    }
    if (needSave && recordId !== "") {
      const newChatEntity = new ChatHistoryEntity();
      newChatEntity.originMsg = JSON.stringify({ aiResHistory: callMsg });
      newChatEntity.content = chunks;
      const updateResult = await this.chatHistoryService.updateChatHistoryByRecordId({
        recordId,
        chatHistoryEntity: newChatEntity
      });
      if (!updateResult) {
        console.log("更新聊天记录失败：数据库更新失败", {
          recordId
        });
      }
    }
    if (conversationId) {
      try {
        await this.conversationRelationService.setConversationsTitle({
          conversationId,
          userMessage
        });
      } catch (titleError) {
        console.log("setConversationsTitle err:", titleError);
      }
    }
  }
  async chat(options) {
    const { messages } = await this.chatContextService.prepareMessages({
      msg: options.msg,
      files: options.files,
      history: options.history,
      searchEnable: options.searchEnable && this.botContext.info.searchNetworkEnable,
      triggerSrc: TRIGGER_SRC_TCB,
      needSSE: true
    });
    const { replyRecordId, conversationId } = await this.beforeStream({
      msg: options.msg,
      files: options.files,
      conversationId: options.conversationId || ""
    });
    const llmCommunicator = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      mcpEnable: true
    });
    if (this.sseSender) {
      llmCommunicator.setSSESender(this.sseSender);
    }
    console.log("messages:", messages);
    const result = await llmCommunicator.stream({
      messages,
      recordId: replyRecordId
    });
    await this.afterStream({
      needSave: true,
      recordId: replyRecordId,
      conversationId,
      userMessage: options.msg,
      ...result
    });
    return result;
  }
  /**
   * 流式对话 - 返回 AsyncGenerator 用于 AG-UI
   * 直接透传 AG-UI 事件，不做任何翻译
   */
  async *chatStream(options) {
    const { messages } = await this.chatContextService.prepareMessages({
      msg: options.msg,
      files: options.files,
      history: options.history,
      searchEnable: options.searchEnable && this.botContext.info.searchNetworkEnable,
      triggerSrc: TRIGGER_SRC_TCB,
      needSSE: false
      // 不需要 SSE，使用 AsyncGenerator
    });
    const { replyRecordId, conversationId } = await this.beforeStream({
      msg: options.msg,
      files: options.files,
      conversationId: options.conversationId || ""
    });
    const llmCommunicator = new LLMCommunicator(this.botContext, {
      ...this.botContext.config,
      mcpEnable: true
    });
    let fullContent = "";
    let error = null;
    try {
      for await (const event of llmCommunicator.streamEvents({
        messages,
        recordId: replyRecordId
      })) {
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          fullContent += event.delta || "";
        }
        if (event.type === EventType.RUN_ERROR) {
          error = event.message;
        }
        yield event;
      }
    } catch (e) {
      error = e;
      yield {
        type: EventType.RUN_ERROR,
        message: e instanceof Error ? e.message : "Unknown error"
      };
    }
    await this.afterStream({
      needSave: true,
      recordId: replyRecordId,
      conversationId,
      userMessage: options.msg,
      chunks: fullContent,
      error
    });
  }
}

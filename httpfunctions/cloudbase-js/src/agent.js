"use strict";
import {
  AbstractAgent,
  EventType
} from "@ag-ui/client";
import { Observable } from "rxjs";
import { BotContext } from "./types/bot_context.js";
import { botConfig } from "./config/bot_config.js";
import { BotInfo } from "./config/bot_info.js";
import { MainChatService } from "./services/chat_main.service.js";
import { LLMCommunicator } from "./llm/llm_communicator.js";
import {
  createCloudbaseContext,
  getRequestContext
} from "./adapters/context-adapter.js";
import { replaceEnvId, replaceReadMe } from "./utils/tcb.js";
function parseBotId(url) {
  if (!url) return "default-bot";
  const match = url.match(/\/bots\/([^/]+)/);
  if (match) {
    return match[1];
  }
  return "default-bot";
}
export class CloudbaseAgent extends AbstractAgent {
  botContext;
  mainChatService;
  config;
  constructor(context, config) {
    super();
    const rawConfig = config || botConfig;
    this.config = {
      ...rawConfig,
      baseURL: replaceEnvId(rawConfig.baseURL),
      agentSetting: replaceReadMe(rawConfig.agentSetting)
    };
    this.botContext = new BotContext(context);
    this.botContext.config = this.config;
    this.botContext.info = new BotInfo(
      parseBotId(context.httpContext?.url),
      this.config
    );
    this.mainChatService = new MainChatService(this.botContext);
  }
  /**
   * 运行 Agent
   * 实现 AG-UI 协议的流式响应
   */
  run(input) {
    return new Observable((subscriber) => {
      this.runAsync(input, subscriber).catch((error) => {
        console.error("CloudbaseAgent run error:", error);
        subscriber.next({
          type: EventType.RUN_ERROR,
          message: error instanceof Error ? error.message : "Unknown error"
        });
        subscriber.complete();
      });
    });
  }
  /**
   * 异步执行对话
   */
  async runAsync(input, subscriber) {
    try {
      const state = input?.state;
      if (state) {
        const requestContext = getRequestContext(state);
        if (requestContext) {
          const newContext = createCloudbaseContext(requestContext);
          this.botContext.context = newContext;
        }
      }
    } catch (e) {
      console.log("update CloudbaseContext from state failed:", e);
    }
    const { messages, threadId, runId } = input;
    if (!messages || messages.length === 0) {
      subscriber.next({
        type: EventType.RUN_ERROR,
        message: "messages must contain at least one item"
      });
      return;
    }
    const forwardedProps = input.forwardedProps ?? {};
    try {
      subscriber.next({
        type: EventType.RUN_STARTED,
        runId,
        threadId
      });
      const lastMessage = messages[messages.length - 1];
      const userMessage = forwardedProps.msg ?? this.extractMessageContent(lastMessage);
      const history = forwardedProps.history ?? messages.slice(0, -1).map((msg) => ({
        role: msg.role,
        content: this.extractMessageContent(msg)
      }));
      const files = forwardedProps.files ?? [];
      const searchEnable = forwardedProps.searchEnable ?? this.botContext.info.searchNetworkEnable;
      const needSSE = forwardedProps.needSSE ?? false;
      const llmCommunicator = new LLMCommunicator(this.botContext, {
        ...this.config,
        mcpEnable: true
      });
      const chatContextService = this.mainChatService.chatContextService;
      const { messages: preparedMessages } = await chatContextService.prepareMessages({
        msg: userMessage,
        history,
        files,
        searchEnable,
        needSSE
      });
      const { replyRecordId, conversationId } = await this.mainChatService.beforeStream({
        msg: userMessage,
        files,
        conversationId: threadId || ""
      });
      let fullContent = "";
      let hasError = false;
      for await (const event of llmCommunicator.streamEvents({
        messages: preparedMessages,
        recordId: replyRecordId
      })) {
        if (event.type === EventType.RUN_ERROR) {
          console.error("CloudbaseAgent runAsync LLM error:", event.message);
          subscriber.next(event);
          hasError = true;
          break;
        }
        if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
          fullContent += event.delta || "";
        }
        subscriber.next(event);
      }
      if (hasError) {
        return;
      }
      await this.mainChatService.afterStream({
        needSave: true,
        recordId: replyRecordId,
        conversationId,
        userMessage,
        chunks: fullContent
      });
      subscriber.next({
        type: EventType.RUN_FINISHED
      });
    } catch (error) {
      console.error("CloudbaseAgent runAsync error:", error);
      subscriber.next({
        type: EventType.RUN_ERROR,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      subscriber.complete();
    }
  }
  /**
   * 提取消息内容
   */
  extractMessageContent(message) {
    if (typeof message.content === "string") {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content.map((part) => {
        if (typeof part === "string") return part;
        if (part.type === "text") return part.text || "";
        return "";
      }).join("");
    }
    return "";
  }
}
export function createAgent({ request }) {
  const requestContext = {
    user: { id: "anonymous", jwt: {} },
    request
  };
  const context = createCloudbaseContext(requestContext);
  const agent = new CloudbaseAgent(context);
  return { agent };
}

"use strict";
import OpenAI from "openai";
import {
  convertMessagesToOpenAI,
  processOpenAIStream
} from "@cloudbase/agent-adapter-llm";
import { EventType } from "@ag-ui/client";
import { McpClient } from "./mcp.js";
import { getApiKey } from "../config/env.js";
export class LLMCommunicator {
  botContext;
  openai;
  modelInfo;
  mcpEnable = true;
  mcpClient;
  controller;
  sseSender;
  constructor(botContext, options) {
    this.botContext = botContext;
    this.modelInfo = {
      model: options.model || botContext.config.model,
      baseURL: options.baseURL || botContext.config.baseURL,
      apiKey: options.apiKey || botContext.config.apiKey || getApiKey()
    };
    this.initModel();
    this.mcpEnable = !!options.mcpEnable;
    if (this.mcpEnable) {
      this.mcpClient = new McpClient(botContext);
    }
    this.controller = new AbortController();
  }
  /**
   * 设置 SSE 发送器
   */
  setSSESender(sseSender) {
    this.sseSender = sseSender;
  }
  initModel() {
    this.openai = new OpenAI({
      apiKey: this.modelInfo.apiKey,
      baseURL: this.modelInfo.baseURL
    });
  }
  normalizeToolParameters(parameters) {
    if (parameters && typeof parameters === "object" && !Array.isArray(parameters)) {
      return parameters;
    }
    return {
      type: "object",
      properties: {},
      additionalProperties: true
    };
  }
  async getOpenAITools() {
    if (!this.mcpEnable || !this.mcpClient) {
      return void 0;
    }
    try {
      const mcpTools = await this.mcpClient.tools();
      const toolEntries = Object.entries(mcpTools);
      if (!toolEntries.length) {
        return void 0;
      }
      return toolEntries.map(([name, toolDef]) => ({
        type: "function",
        function: {
          name,
          description: toolDef.description || "",
          parameters: this.normalizeToolParameters(toolDef.parameters)
        }
      }));
    } catch (error) {
      console.log("getOpenAITools error:", error);
      return void 0;
    }
  }
  /**
   * 将 ChatCompletionMessage 转换为 @ag-ui/client Message 格式
   * 用于适配 adapter-llm 的 convertMessagesToOpenAI
   */
  toAGUIMessages(messages) {
    return messages.map((msg) => {
      const role = msg.role;
      if (role === "tool") {
        return {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          role: "tool",
          toolCallId: msg.tool_call_id || "",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
        };
      }
      return {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role,
        content: typeof msg.content === "string" ? msg.content : "",
        toolCalls: msg.tool_calls?.map((tc) => ({
          id: tc.id || `tool_${tc.index}`,
          type: "function",
          function: {
            name: tc.function?.name || "",
            arguments: tc.function?.arguments || ""
          }
        }))
      };
    });
  }
  /**
   * 发送流式对话 - 使用 SSE
   * 内部使用 @cloudbase/agent-adapter-llm 的 processOpenAIStream
   */
  async stream({
    messages,
    recordId,
    systemPrompt
  }) {
    let chunks = "";
    const callMsg = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let error = null;
    try {
      const aguiMessages = this.toAGUIMessages(messages);
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt);
      const tools = await this.getOpenAITools();
      const stream = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        ...tools ? {
          tools,
          tool_choice: "auto"
        } : {}
      });
      const context = {
        threadId: recordId,
        runId: recordId,
        messageId: `msg_${Date.now()}`
      };
      let latestFinishReason = "stop";
      for await (const event of processOpenAIStream(stream, context)) {
        const eventType = event.type;
        const eventAny = event;
        const finishReasonFromEvent = eventAny.finish_reason || eventAny.finishReason || eventAny.reason || eventAny.delta?.finish_reason;
        if (typeof finishReasonFromEvent === "string" && finishReasonFromEvent !== "continue") {
          latestFinishReason = finishReasonFromEvent;
        }
        const usage = eventAny.usage || eventAny.response?.usage || eventAny.chunk?.usage;
        if (usage && typeof usage === "object") {
          promptTokens = Number(usage.prompt_tokens ?? usage.promptTokens ?? promptTokens);
          completionTokens = Number(
            usage.completion_tokens ?? usage.completionTokens ?? completionTokens
          );
          totalTokens = Number(usage.total_tokens ?? usage.totalTokens ?? totalTokens);
        }
        if (eventType === "TEXT_MESSAGE_CONTENT") {
          const delta = event.delta || "";
          chunks += delta;
          const result = {
            type: "text",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: delta,
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
          callMsg.push(result);
        }
        if (eventType === "THINKING_START") {
          const result = {
            type: "thinking_start",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
        }
        if (eventType === "THINKING_TEXT_MESSAGE_START") {
          const result = {
            type: "thinking_text_start",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
        }
        if (eventType === "THINKING_TEXT_MESSAGE_CONTENT") {
          const delta = event.delta || "";
          const result = {
            type: "reasoning",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            reasoning_content: delta,
            content: "",
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
          callMsg.push(result);
        }
        if (eventType === "THINKING_TEXT_MESSAGE_END") {
          const result = {
            type: "thinking_text_end",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
        }
        if (eventType === "THINKING_END") {
          const result = {
            type: "thinking_end",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
        }
        if (eventType === "TOOL_CALL_START") {
          const toolCallId = event.toolCallId;
          const toolCallName = event.toolCallName;
          const result = {
            type: "tool_call_start",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            tool_call: JSON.stringify({ id: toolCallId, name: toolCallName }),
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
          callMsg.push(result);
        }
        if (eventType === "TOOL_CALL_ARGS") {
          const toolCallId = event.toolCallId;
          const delta = event.delta || "";
          const result = {
            type: "tool_call_args",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: delta,
            tool_call: JSON.stringify({ id: toolCallId }),
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
          callMsg.push(result);
        }
        if (eventType === "TOOL_CALL_END") {
          const toolCallId = event.toolCallId;
          const result = {
            type: "tool_call_end",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            tool_call: JSON.stringify({ id: toolCallId }),
            finish_reason: "continue",
            usage: {}
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(result)}

`);
          }
          callMsg.push(result);
        }
        if (eventType === "TEXT_MESSAGE_END") {
          const finishResult = {
            type: "finish",
            created: Date.now(),
            record_id: recordId,
            model: this.modelInfo.model,
            role: "assistant",
            content: "",
            finish_reason: latestFinishReason,
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: totalTokens
            }
          };
          if (this.sseSender) {
            this.sseSender.send(`data: ${JSON.stringify(finishResult)}

`);
          }
        }
      }
    } catch (e) {
      error = e;
      console.error("LLM stream error:", e);
      const err = e;
      const errorResult = {
        type: "error",
        created: Date.now(),
        record_id: recordId,
        model: this.modelInfo.model,
        role: "assistant",
        content: "",
        finish_reason: "error",
        error: {
          name: err.name || "Error",
          message: err.message || "Unknown error"
        },
        usage: {}
      };
      if (this.sseSender) {
        this.sseSender.send(`data: ${JSON.stringify(errorResult)}

`);
      }
    } finally {
      await this.mcpClient?.close();
    }
    return {
      error,
      chunks,
      callMsg,
      promptTokens,
      completionTokens,
      totalTokens
    };
  }
  /**
   * 流式对话生成器 - 用于 AG-UI
   * 直接透传 @cloudbase/agent-adapter-llm 的 processOpenAIStream 产出的 AG-UI 事件
   * 不做任何翻译或过滤，所有事件类型（包括 THINKING_* 系列）完整传递
   */
  async *streamEvents({
    messages,
    recordId,
    systemPrompt
  }) {
    try {
      const aguiMessages = this.toAGUIMessages(messages);
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt);
      const tools = await this.getOpenAITools();
      const stream = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        stream: true,
        stream_options: { include_usage: true },
        ...tools ? {
          tools,
          tool_choice: "auto"
        } : {}
      });
      const context = {
        threadId: recordId,
        runId: recordId,
        messageId: `msg_${Date.now()}`
      };
      for await (const event of processOpenAIStream(stream, context)) {
        yield event;
      }
    } catch (e) {
      yield {
        type: EventType.RUN_ERROR,
        message: e instanceof Error ? e.message : "LLM error"
      };
    } finally {
      await this.mcpClient?.close();
    }
  }
  /**
   * 非流式对话
   */
  async text({
    messages,
    systemPrompt,
    cb
  }) {
    try {
      const aguiMessages = this.toAGUIMessages(messages);
      const openaiMessages = convertMessagesToOpenAI(aguiMessages, systemPrompt);
      const tools = await this.getOpenAITools();
      const response = await this.openai.chat.completions.create({
        model: this.modelInfo.model,
        messages: openaiMessages,
        ...tools ? {
          tools,
          tool_choice: "auto"
        } : {}
      });
      return cb(response);
    } catch (error) {
      console.error("LLM text error:", error);
      return {};
    } finally {
      await this.mcpClient?.close();
    }
  }
}

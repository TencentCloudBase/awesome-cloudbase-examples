"use strict";
import fs from "fs";
import express from "express";
import { createExpressRoutes } from "@cloudbase/agent-server";
import {
  WeChatAgent,
  createWxMessageHandler,
  WeChatSendMode
} from "@cloudbase/agent-adapter-wx";
import dotenvx from "@dotenvx/dotenvx";
import path from "path";
import { createAgent } from "./agent.js";
import { createCloudbaseContext } from "./adapters/context-adapter.js";
import { DetectCloudbaseUserMiddleware } from "./middlewares/detect-user.js";
import { getEnvId } from "./config/env.js";
import { botConfig } from "./config/bot_config.js";
import { BotContext } from "./types/bot_context.js";
import { BotInfo } from "./config/bot_info.js";
import { ChatHistoryService } from "./services/chat_history.service.js";
import { ConversationRelationService } from "./services/conversation_relation.service.js";
import { RecommendQuestionsService } from "./services/recommend_questions.service.js";
import { ChatToolService } from "./services/chat_tool.service.js";
import { DEFAULT_CONVERSATION_TITLE } from "./utils/constants.js";
import { randomId } from "./utils/helpers.js";
import { ConversationRelationEntity } from "./types/entities.js";
import { replaceEnvId, replaceReadMe } from "./utils/tcb.js";
const envPath = path.join(process.cwd(), ".env");
try {
  dotenvx.config({ path: envPath, override: false });
} catch {
}
function createWxAgent({
  request,
  options
}) {
  const { agent: baseAgent } = createAgent({ request });
  const envId = getEnvId();
  return {
    agent: new WeChatAgent({
      agentId: options?.agentId || "cloudbase-agent",
      agent: baseAgent,
      wechatConfig: {
        sendMode: WeChatSendMode.AITOOLS,
        context: {
          extendedContext: {
            envId,
            accessToken: request.headers?.get?.("authorization") || void 0
          }
        }
      }
    })
  };
}
function createApp() {
  const app2 = express();
  app2.use(express.json());
  createExpressRoutes({
    createAgent: ({ request }) => {
      const { agent } = createAgent({ request });
      agent.use(new DetectCloudbaseUserMiddleware(request));
      return { agent };
    },
    express: app2,
    logger: console
  });
  const router = express.Router({ mergeParams: true });
  function getBotId(req) {
    return req.params.botId || req.body?.botId || "agent-cbdev-nobotid";
  }
  function createBotContext(botId) {
    const context = createCloudbaseContext(null);
    const botContext = new BotContext(context);
    const processedConfig = {
      ...botConfig,
      baseURL: replaceEnvId(botConfig.baseURL),
      agentSetting: replaceReadMe(botConfig.agentSetting)
    };
    botContext.config = processedConfig;
    botContext.info = new BotInfo(botId, processedConfig);
    return botContext;
  }
  router.get("/healthz", (req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });
  router.post("/wx-send-message", createWxMessageHandler(createWxAgent));
  router.get("/", (req, res) => {
    const botId = getBotId(req);
    let updateTime = 0;
    try {
      const configPath = path.join(process.cwd(), "bot-config.yaml");
      const fileStats = fs.statSync(configPath);
      updateTime = Math.floor(fileStats.mtime.getTime() / 1e3);
    } catch {
    }
    res.json({
      botId,
      name: botConfig.name,
      model: botConfig.model,
      agentSetting: botConfig.agentSetting,
      introduction: botConfig.introduction,
      welcomeMessage: botConfig.welcomeMessage,
      avatar: botConfig.avatar,
      type: botConfig.type,
      isNeedRecommend: botConfig.isNeedRecommend,
      knowledgeBase: botConfig.knowledgeBase,
      databaseModel: botConfig.databaseModel,
      initQuestions: botConfig.initQuestions,
      searchEnable: botConfig.searchNetworkEnable,
      searchFileEnable: botConfig.searchFileEnable,
      mcpServerList: botConfig.mcpServerList,
      voiceSettings: botConfig.voiceSettings,
      updateTime,
      multiConversationEnable: botConfig.multiConversationEnable
    });
  });
  router.get("/records", async (req, res) => {
    try {
      const sort = req.query.sort || "desc";
      const pageSize = Number(req.query.pageSize) || 10;
      const pageNumber = Number(req.query.pageNumber) || 1;
      const conversationId = req.query.conversationId;
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const chatHistoryService = new ChatHistoryService(botContext);
      const filterAndOptions = [];
      if (conversationId) {
        filterAndOptions.push({
          conversation: {
            $eq: conversationId
          }
        });
      }
      const [recordList, total] = await chatHistoryService.describeChatHistory({
        botId: targetBotId,
        sort,
        pageSize,
        pageNumber,
        filterAndOptions
      });
      res.json({
        recordList: recordList || [],
        total
      });
    } catch (error) {
      console.error("查询聊天记录失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "查询聊天记录失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.post("/conversation", async (req, res) => {
    try {
      const { userId = "", title = DEFAULT_CONVERSATION_TITLE } = req.body || {};
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const conversationRelationService = new ConversationRelationService(
        botContext
      );
      const conversationId = randomId(16);
      const conversationRelationEntity = new ConversationRelationEntity();
      conversationRelationEntity.botId = targetBotId;
      conversationRelationEntity.userId = userId;
      conversationRelationEntity.conversationId = conversationId;
      conversationRelationEntity.title = title;
      const result = await conversationRelationService.createConversationRelation({
        conversationRelationEntity
      });
      if (!result) {
        res.json({
          error: {
            message: "创建会话失败：数据库写入失败",
            name: "DatabaseError"
          }
        });
        return;
      }
      res.json({
        conversationId: result
      });
    } catch (error) {
      console.error("创建会话失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "创建会话失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.get("/conversation", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const offset = Number(req.query.offset) || 0;
      const userId = req.query.userId;
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const conversationRelationService = new ConversationRelationService(
        botContext
      );
      const filterAndOptions = [];
      if (userId) {
        filterAndOptions.push({
          user_id: {
            $eq: userId
          }
        });
      }
      const pageSize = limit;
      const pageNumber = Math.floor(offset / limit) + 1;
      const [conversationList, total] = await conversationRelationService.describeConversationRelation({
        botId: targetBotId,
        pageSize,
        pageNumber,
        filterAndOptions
      });
      res.json({
        conversationList: conversationList || [],
        total
      });
    } catch (error) {
      console.error("查询会话列表失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "查询会话列表失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.patch("/conversation/:conversation", async (req, res) => {
    try {
      const conversationId = req.params.conversation;
      const { title = DEFAULT_CONVERSATION_TITLE } = req.body || {};
      if (!conversationId) {
        res.json({
          error: {
            message: "conversationId 不能为空",
            name: "ValidationError"
          }
        });
        return;
      }
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const conversationRelationService = new ConversationRelationService(
        botContext
      );
      const updateResult = await conversationRelationService.updateConversationRelationTitle({
        botId: targetBotId,
        conversationId,
        title
      });
      if (!updateResult) {
        res.json({
          error: {
            message: "更新会话标题失败：数据库更新失败",
            name: "DatabaseError"
          }
        });
        return;
      }
      res.json({
        success: true
      });
    } catch (error) {
      console.error("更新会话标题失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "更新会话标题失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.delete("/conversation/:conversation", async (req, res) => {
    try {
      const conversationId = req.params.conversation;
      if (!conversationId) {
        res.json({
          error: {
            message: "conversationId 不能为空",
            name: "ValidationError"
          }
        });
        return;
      }
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const conversationRelationService = new ConversationRelationService(
        botContext
      );
      const deleteResult = await conversationRelationService.deleteConversationRelationByID({
        botId: targetBotId,
        conversationId
      });
      if (!deleteResult) {
        res.json({
          error: {
            message: "删除会话失败：数据库删除失败",
            name: "DatabaseError"
          }
        });
        return;
      }
      res.json({
        success: true
      });
    } catch (error) {
      console.error("删除会话失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "删除会话失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.post("/recommend-questions", async (req, res) => {
    try {
      const { msg, history } = req.body || {};
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      const sseSender = {
        send: (data) => {
          res.write(data);
        }
      };
      const recommendQuestionsService = new RecommendQuestionsService(
        botContext,
        sseSender
      );
      await recommendQuestionsService.chat({
        msg,
        history
      });
      res.end();
    } catch (error) {
      console.error("获取推荐问题失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "获取推荐问题失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.post("/speech-to-text", async (req, res) => {
    try {
      const {
        engSerViceType = "16k_zh",
        voiceFormat = "mp3",
        url
      } = req.body || {};
      if (!url) {
        res.json({
          error: {
            message: "url 不能为空",
            name: "ValidationError"
          }
        });
        return;
      }
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const chatToolService = new ChatToolService(botContext);
      const result = await chatToolService.speechToText({
        engSerViceType,
        voiceFormat,
        url
      });
      res.json(result);
    } catch (error) {
      console.error("语音转文字失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "语音转文字失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.post("/text-to-speech", async (req, res) => {
    try {
      const { text, voiceType = 101001 } = req.body || {};
      if (!text) {
        res.json({
          error: {
            message: "text 不能为空",
            name: "ValidationError"
          }
        });
        return;
      }
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const chatToolService = new ChatToolService(botContext);
      const result = await chatToolService.textToSpeech({
        text,
        voiceType
      });
      res.json(result);
    } catch (error) {
      console.error("文字转语音失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "文字转语音失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.get("/text-to-speech", async (req, res) => {
    try {
      const taskId = req.query.taskId;
      if (!taskId) {
        res.json({
          error: {
            message: "taskId 不能为空",
            name: "ValidationError"
          }
        });
        return;
      }
      const targetBotId = getBotId(req);
      const botContext = createBotContext(targetBotId);
      const chatToolService = new ChatToolService(botContext);
      const result = await chatToolService.getTextToSpeechResult({
        taskId
      });
      res.json(result);
    } catch (error) {
      console.error("查询文字转语音结果失败:", error);
      const err = error;
      res.json({
        error: {
          message: err.message || "查询文字转语音结果失败",
          name: err.name || "Error"
        }
      });
    }
  });
  router.post("/feedback", async (req, res) => {
    res.json({
      error: {
        message: "feedback 功能暂未实现",
        name: "NotImplemented"
      }
    });
  });
  router.get("/feedback", async (req, res) => {
    res.json({
      error: {
        message: "feedback 功能暂未实现",
        name: "NotImplemented"
      }
    });
  });
  app2.use("/", router);
  app2.use("/v1/aibot/bots/:botId", router);
  app2.use(
    (err, req, res, next) => {
      console.error("Express error:", err);
      res.json({
        error: {
          message: err.message || "Internal server error",
          name: err.name || "Error"
        }
      });
    }
  );
  return app2;
}
const app = createApp();
const PORT = 9000;
app.listen(PORT, () => {
  console.log(`Cloudbase Agent server is running on port ${PORT}`);
  console.log(`Environment: ${getEnvId() || "not set"}`);
  console.log(`Bot Name: ${botConfig.name}`);
});
export { app, createAgent, createWxAgent };

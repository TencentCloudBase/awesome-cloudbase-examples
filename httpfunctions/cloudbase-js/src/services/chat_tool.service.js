"use strict";
import { aitools } from "@cloudbase/aiagent-framework";
import { getApiKey, getOpenAPIBaseURL } from "../config/env.js";
function isErrorCode(code) {
  if (code === void 0 || code === null) {
    return false;
  }
  if (typeof code === "number") {
    return code !== 0;
  }
  if (typeof code === "string") {
    const trimmed = code.trim();
    if (!trimmed) return false;
    return trimmed !== "0";
  }
  return true;
}
export class ChatToolService {
  botContext;
  sseSender;
  constructor(botContext, sseSender) {
    this.botContext = botContext;
    this.sseSender = sseSender;
  }
  /**
   * 发送 SSE 事件
   */
  sendSSE(data, needSSE) {
    if (needSSE && this.sseSender) {
      this.sseSender.send(`data: ${JSON.stringify(data)}

`);
    }
  }
  /**
   * 联网搜索
   */
  async handleSearchNetwork({
    msg,
    searchEnable,
    needSSE
  }) {
    if (!searchEnable) {
      return null;
    }
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.searchNetwork(
      baseURL,
      token,
      this.botContext.info.botId,
      msg
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`查询联网内容失败 ${result?.message}`);
    }
    if (result) {
      const data = {
        type: "search",
        created: Date.now(),
        model: "hunyuan",
        role: "assistant",
        content: "",
        search_info: {
          search_results: result.searchInfo?.searchResults
        },
        finish_reason: "continue"
      };
      this.sendSSE(data, needSSE);
      if (result.content) {
        const netKnowledgeList = [
          { question: msg, answer: result.content ?? "" }
        ];
        const netKnowledgeText = netKnowledgeList.map(({ question, answer }) => {
          return `### 用户问题:
${question}
### 内容：
${answer}`;
        }).join("\n");
        const prompt = `

  以下是用户问题可能涉及的一些通过联网搜索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。

  ${netKnowledgeText}

      `;
        return {
          prompt,
          result
        };
      }
    }
    return null;
  }
  async handleSearchFile({
    msg,
    files,
    needSSE
  }) {
    if (files?.length === 0 || !this.botContext.info.searchFileEnable) {
      return null;
    }
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.searchFile(
      baseURL,
      token,
      this.botContext.info.botId,
      msg,
      files
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`查询文件内容失败: ${result?.message}`);
    }
    if (result && result.content && result.content.length > 0) {
      const data = {
        type: "search_file",
        created: Date.now(),
        model: "hunyuan",
        role: "assistant",
        content: result.content ?? "",
        finish_reason: "continue"
      };
      this.sendSSE(data, needSSE);
      const fileList = [{ question: msg, answer: result.content ?? "" }];
      const searchFileText = fileList.map(({ question, answer }) => {
        return `### 标题:
${question}
### 内容：
${answer}`;
      }).join("\n");
      const prompt = `
<file_search desc="基于图片或PDF等类型的文件检索">
  以下是用户问题可能涉及的一些通过上传图片或PDF等类型的文件检索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。
  <file_search_result>
  ${searchFileText}
  </file_search_result>
</file_search>
`;
      return {
        prompt,
        result
      };
    }
    return null;
  }
  async handleSearchDB({
    msg,
    needSSE
  }) {
    if (this.botContext.info.databaseModel.length === 0) {
      return null;
    }
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.searchDB(
      baseURL,
      token,
      this.botContext.info.botId,
      msg,
      this.botContext.info.databaseModel
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`查询数据模型内容失败: ${result?.message}`);
    }
    if (result) {
      const data = {
        type: "db",
        created: Date.now(),
        role: "assistant",
        content: "",
        finish_reason: "continue",
        search_results: {
          relateTables: result.searchResult?.relateTables?.length ?? 0
        }
      };
      this.sendSSE(data, needSSE);
      const prompt = `
<db_search desc="数据库查询">
  <db_search_result>
  ${result.searchResult?.answerPrompt ?? ""}
  </db_search_result>
</db_search>
`;
      return {
        prompt,
        result
      };
    }
    return null;
  }
  async handleSearchKnowledgeBase({
    msg,
    needSSE
  }) {
    if (this.botContext?.info?.knowledgeBase?.length === 0) {
      return null;
    }
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.searchKnowledgeBase(
      baseURL,
      token,
      this.botContext.info.botId,
      msg,
      this.botContext.info.knowledgeBase
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`查询知识库内容失败: ${result?.message}`);
    }
    if (result?.documents && result.documents.length > 0) {
      const documentSetNameList = [];
      const fileMetaDataList = [];
      result.documents.forEach(
        (doc) => {
          const { score, documentSet } = doc;
          if (score < 0.7) {
            return;
          }
          if (documentSet?.documentSetName) {
            documentSetNameList.push(documentSet.documentSetName);
          }
          if (documentSet?.fileMetaData) {
            fileMetaDataList.push(documentSet.fileMetaData);
          }
        }
      );
      if (documentSetNameList.length !== 0 && fileMetaDataList.length !== 0) {
        const sseData = {
          type: "knowledge",
          created: Date.now(),
          role: "assistant",
          content: "",
          finish_reason: "continue",
          knowledge_base: Array.from(documentSetNameList),
          knowledge_meta: Array.from(fileMetaDataList)
        };
        this.sendSSE(sseData, needSSE);
      }
      const highScoreDocuments = result.documents.filter(
        (doc) => doc.score > 0.7
      );
      if (!highScoreDocuments || highScoreDocuments.length === 0) {
        return {
          prompt: "",
          result
        };
      }
      const knowledgeText = highScoreDocuments.map((doc) => {
        return `### 内容：
${doc.data.text}`;
      }).join("\n");
      const prompt = `
<search_knowledge_base desc="知识库检索">
  以下是用户问题可能涉及的一些背景知识和相关资料。回答问题需要充分依赖这些背景知识和相关资料。请优先参考这部分内容。
  <knowledge_base_result>
  ${knowledgeText}
  </knowledge_base_result>
</search_knowledge_base>
      `;
      return {
        prompt,
        result
      };
    }
    return {
      prompt: "",
      result
    };
  }
  /**
   * 语音转文字 (ASR)
   */
  async speechToText(input) {
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.speechToText(
      baseURL,
      token,
      this.botContext.info.botId,
      input.engSerViceType,
      input.voiceFormat,
      input.url
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`语音转文字失败: ${result?.message}`);
    }
    return result;
  }
  /**
   * 文字转语音 (TTS)
   */
  async textToSpeech(input) {
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.textToSpeech(
      baseURL,
      token,
      this.botContext.info.botId,
      input.text,
      input.voiceType
    );
    if (isErrorCode(result?.code)) {
      throw new Error(`文字转语音失败: ${result?.message}`);
    }
    return result;
  }
  /**
   * 查询文字转语音结果
   */
  async getTextToSpeechResult(input) {
    try {
      const token = getApiKey();
      const baseURL = getOpenAPIBaseURL();
      const result = await aitools.getTextToSpeech(
        baseURL,
        token,
        this.botContext.info.botId,
        input.taskId
      );
      if (isErrorCode(result?.code)) {
        throw new Error(`查询文字转语音状态失败: ${result?.message}`);
      }
      return result;
    } catch (error) {
      const err = error;
      throw new Error(`查询文字转语音状态失败: ${err.message}`);
    }
  }
}

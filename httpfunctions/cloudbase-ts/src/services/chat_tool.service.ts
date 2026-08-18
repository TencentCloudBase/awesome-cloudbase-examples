import { aitools } from "@cloudbase/aiagent-framework";
import { BotContext } from "../types/bot_context.js";
import { getApiKey, getOpenAPIBaseURL } from "../config/env.js";
import {
  SpeechToTextInput,
  SpeechToTextResult,
  TextToSpeechInput,
  TextToSpeechResult,
  GetTextToSpeechResultInput,
  GetTextToSpeechResult,
} from "../types/entities.js";
import type { SSESender } from "../types/context.js";

type SearchDBResult = aitools.SearchDBResult;
type SearchNetworkResult = aitools.SearchNetworkResult;
type SearchFileResult = aitools.SearchFileResult;
type SearchKnowledgeResult = aitools.SearchKnowledgeResult;

type ToolCallResultT =
  | SearchDBResult
  | SearchNetworkResult
  | SearchFileResult
  | SearchKnowledgeResult;

interface ToolCallResult<T extends ToolCallResultT> {
  // 工具返回的结果
  result: T;
  // 接口内基于 result 封装的提示词
  prompt: string;
}

/**
 * 判断工具返回码是否表示错误
 * 约定：undefined/null/''/'0'/0 视为成功，其它视为错误
 */
function isErrorCode(code: unknown): boolean {
  if (code === undefined || code === null) {
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
  // 其它非常规类型一律视为错误，避免静默失败
  return true;
}

export class ChatToolService {
  botContext: BotContext;
  private sseSender?: SSESender;

  constructor(botContext: BotContext, sseSender?: SSESender) {
    this.botContext = botContext;
    this.sseSender = sseSender;
  }

  /**
   * 发送 SSE 事件
   */
  private sendSSE(data: object, needSSE: boolean) {
    if (needSSE && this.sseSender) {
      this.sseSender.send(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  /**
   * 联网搜索
   */
  async handleSearchNetwork({
    msg,
    searchEnable,
    needSSE,
  }: {
    msg: string;
    searchEnable: boolean;
    needSSE: boolean;
  }): Promise<ToolCallResult<SearchNetworkResult> | null> {
    if (!searchEnable) {
      return null;
    }

    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = await aitools.searchNetwork(
      baseURL,
      token,
      this.botContext.info.botId,
      msg,
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
          search_results: result.searchInfo?.searchResults,
        },
        finish_reason: "continue",
      };

      this.sendSSE(data, needSSE);

      if (result.content) {
        const netKnowledgeList = [
          { question: msg, answer: result.content ?? "" },
        ];
        const netKnowledgeText = netKnowledgeList
          .map(({ question, answer }) => {
            return `### 用户问题:\n${question}\n### 内容：\n${answer}`;
          })
          .join("\n");
        const prompt = `

  以下是用户问题可能涉及的一些通过联网搜索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。

  ${netKnowledgeText}

      `;
        return {
          prompt: prompt,
          result: result,
        };
      }
    }
    return null;
  }

  async handleSearchFile({
    msg,
    files,
    needSSE,
  }: {
    msg: string;
    files: string[];
    needSSE: boolean;
  }): Promise<ToolCallResult<SearchFileResult> | null> {
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
      files,
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
        finish_reason: "continue",
      };
      this.sendSSE(data, needSSE);

      const fileList = [{ question: msg, answer: result.content ?? "" }];
      const searchFileText = fileList
        .map(({ question, answer }) => {
          return `### 标题:\n${question}\n### 内容：\n${answer}`;
        })
        .join("\n");
      const prompt = `
<file_search desc="基于图片或PDF等类型的文件检索">
  以下是用户问题可能涉及的一些通过上传图片或PDF等类型的文件检索出的信息以及相关资料。回答问题需要充分依赖这些相关资料。
  <file_search_result>
  ${searchFileText}
  </file_search_result>
</file_search>
`;
      return {
        prompt: prompt,
        result: result,
      };
    }
    return null;
  }

  async handleSearchDB({
    msg,
    needSSE,
  }: {
    msg: string;
    needSSE: boolean;
  }): Promise<ToolCallResult<SearchDBResult> | null> {
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
      this.botContext.info.databaseModel,
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
          relateTables: result.searchResult?.relateTables?.length ?? 0,
        },
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
        prompt: prompt,
        result: result,
      };
    }
    return null;
  }

  async handleSearchKnowledgeBase({
    msg,
    needSSE,
  }: {
    msg: string;
    needSSE: boolean;
  }): Promise<ToolCallResult<SearchKnowledgeResult> | null> {
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
      this.botContext.info.knowledgeBase,
    );

    if (isErrorCode(result?.code)) {
      throw new Error(`查询知识库内容失败: ${result?.message}`);
    }

    if (result?.documents && result.documents.length > 0) {
      const documentSetNameList: string[] = [];
      const fileMetaDataList: unknown[] = [];
      result.documents.forEach(
        (doc: SearchKnowledgeResult["documents"][number]) => {
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
        },
      );

      // 知识库
      if (documentSetNameList.length !== 0 && fileMetaDataList.length !== 0) {
        const sseData = {
          type: "knowledge",
          created: Date.now(),
          role: "assistant",
          content: "",
          finish_reason: "continue",
          knowledge_base: Array.from(documentSetNameList),
          knowledge_meta: Array.from(fileMetaDataList),
        };
        this.sendSSE(sseData, needSSE);
      }

      const highScoreDocuments = result.documents.filter(
        (doc: SearchKnowledgeResult["documents"][number]) => doc.score > 0.7,
      );

      if (!highScoreDocuments || highScoreDocuments.length === 0) {
        return {
          prompt: "",
          result: result,
        };
      }

      const knowledgeText = highScoreDocuments
        .map((doc: SearchKnowledgeResult["documents"][number]) => {
          return `### 内容：\n${doc.data.text}`;
        })
        .join("\n");

      const prompt = `
<search_knowledge_base desc="知识库检索">
  以下是用户问题可能涉及的一些背景知识和相关资料。回答问题需要充分依赖这些背景知识和相关资料。请优先参考这部分内容。
  <knowledge_base_result>
  ${knowledgeText}
  </knowledge_base_result>
</search_knowledge_base>
      `;
      return {
        prompt: prompt,
        result: result,
      };
    }

    return {
      prompt: "",
      result: result as SearchKnowledgeResult,
    };
  }

  /**
   * 语音转文字 (ASR)
   */
  async speechToText(input: SpeechToTextInput): Promise<SpeechToTextResult> {
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = (await aitools.speechToText(
      baseURL,
      token,
      this.botContext.info.botId,
      input.engSerViceType,
      input.voiceFormat,
      input.url,
    )) as SpeechToTextResult;

    if (isErrorCode(result?.code)) {
      throw new Error(`语音转文字失败: ${result?.message}`);
    }

    return result;
  }

  /**
   * 文字转语音 (TTS)
   */
  async textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechResult> {
    const token = getApiKey();
    const baseURL = getOpenAPIBaseURL();
    const result = (await aitools.textToSpeech(
      baseURL,
      token,
      this.botContext.info.botId,
      input.text,
      input.voiceType,
    )) as TextToSpeechResult;

    if (isErrorCode(result?.code)) {
      throw new Error(`文字转语音失败: ${result?.message}`);
    }

    return result;
  }

  /**
   * 查询文字转语音结果
   */
  async getTextToSpeechResult(
    input: GetTextToSpeechResultInput,
  ): Promise<GetTextToSpeechResult> {
    try {
      const token = getApiKey();
      const baseURL = getOpenAPIBaseURL();
      const result = (await aitools.getTextToSpeech(
        baseURL,
        token,
        this.botContext.info.botId,
        input.taskId,
      )) as GetTextToSpeechResult;

      if (isErrorCode(result?.code)) {
        throw new Error(`查询文字转语音状态失败: ${result?.message}`);
      }

      return result;
    } catch (error) {
      const err = error as Error;
      throw new Error(`查询文字转语音状态失败: ${err.message}`);
    }
  }
}

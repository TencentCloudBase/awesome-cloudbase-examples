import {
  BotCoreSseSender,
  TcbContext,
} from "@cloudbase/aiagent-framework/dist/types";
import { randomUUID } from "crypto";
import OpenAI from "openai";

export const ADP_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";

export class ADP {
  context: TcbContext;
  apiKey: string;
  adpAgent: OpenAI;

  constructor(context: TcbContext, apiKey: string) {
    this.context = context;
    this.apiKey = apiKey;
    this.adpAgent = new OpenAI({
      apiKey: apiKey,
      baseURL: ADP_URL,
    });
  }

  /**
   * 获取对话句柄
   * @param msg 消息内容
   * @returns 对话句柄
   */
  async createChatCompletion(msg: string) {
    let userId = this.context.extendedContext?.userId;
    if (userId) {
      console.log("Using `extendedContext.userId` as `session_id`");
    } else {
      console.log("Using `randomUUID()` as `session_id`");
      userId = randomUUID();
    }

    // 调用 ADP 平台对话接口
    const chatCompletion = await this.adpAgent.chat.completions.create(
      { stream: true, messages: [], model: "" },
      {
        body: {
          session_id: userId,
          bot_app_key: this.apiKey,
          content: msg,
          incremental: true,
          stream: "enable",
        },
        path: "",
      },
    );
    return chatCompletion;
  }

  /**
   * 处理消息句柄，并将信息以 SSE 形式返回
   * @param chatCompletion 消息句柄
   * @param sseSender SSE 响应处理
   * @returns 消息内容
   */
  async handleCompletion(
    chatCompletion: any,
    sseSender: BotCoreSseSender,
  ): Promise<string> {
    let replyContent = "";
    for await (const _chunk of chatCompletion) {
      const chunkWithData = _chunk as unknown as { data: ADPChunk };
      const chunk = chunkWithData.data;

      if (chunk.type === "reply") {
        if (chunk?.payload?.is_from_self === true) continue;

        const content = chunk?.payload?.content ?? "";
        // 累加到 replyContent 中
        replyContent += content;
        // 发送给客户端
        sseSender.send({
          data: {
            ...chunk?.payload,
            type: "text",
            content,
          },
        });
      }
      if (chunk.type === "thought") {
        const reasoning_content = chunk?.payload?.procedures
          ?.map((x) => x?.debugging?.content ?? "")
          .join("");
        sseSender.send({
          data: {
            ...chunk?.payload,
            type: "text",
            reasoning_content,
            content: "",
          },
        });
      }
    }
    sseSender.end();
    return replyContent;
  }
}

export type ADPChunk =
  | { type: "reply"; payload: ReplyEvent }
  | { type: "thought"; payload: ThoughtEvent }
  | { type: "token_stat"; payload: TokenStatEvent }
  | { type: "error"; payload: ErrorEvent }
  | { type: "reference"; payload: ReferenceEvent };

// 回复事件类型定义
interface ReplyEvent {
  request_id: string; // 请求 ID，用于标识一个请求
  content: string; // 消息内容
  file_infos: FileInfo[]; // 文件信息
  record_id: string; // 消息唯一 ID
  related_record_id: string; // 关联的消息唯一 ID
  session_id: string; // 会话 ID
  is_from_self: boolean; // 消息是否由自己发出
  can_rating: boolean; // 该消息记录是否能评价
  timestamp: number; // 消息时间戳（秒级）
  is_final: boolean; // 消息是否已输出完
  is_evil: boolean; // 是否命中敏感内容
  is_llm_generated: boolean; // 是否为模型生成内容
  reply_method: ReplyMethod; // 回复方式
  knowledge?: Knowledge[]; // 命中的知识
  option_cards?: string[]; // 选项卡，任务流程专有
  custom_params?: string[]; // 用户自定义业务参数
  task_flow?: TaskFlow; // 任务流程调试信息
  work_flow?: WorkFlow; // 工作流调试信息
  quote_infos?: QuoteInfo[]; // 引用信息
}

// 文件信息类型
interface FileInfo {
  // 文件信息的具体字段
  [key: string]: any;
}

// 回复方式枚举
enum ReplyMethod {
  LLM_REPLY = 1,
  UNKNOWN_QUESTION_REPLY = 2,
  REJECT_QUESTION_REPLY = 3,
  SENSITIVE_REPLY = 4,
  ADOPTED_QA_PRIORITY_REPLY = 5,
  WELCOME_REPLY = 6,
  CONCURRENCY_LIMIT_REPLY = 7,
  GLOBAL_INTERVENTION_KNOWLEDGE = 8,
  TASK_FLOW_REPLY = 9,
  TASK_FLOW_ANSWER = 10,
  SEARCH_ENGINE_REPLY = 11,
  KNOWLEDGE_POLISHED_REPLY = 12,
  IMAGE_UNDERSTANDING_REPLY = 13,
  REALTIME_DOCUMENT_REPLY = 14,
  CLARIFICATION_CONFIRMATION_REPLY = 15,
  WORKFLOW_REPLY = 16,
  WORKFLOW_EXECUTION_END = 17,
  AGENT_REPLY = 18,
}

// 命中的知识类型
interface Knowledge {
  id: string; // 命中的知识 ID
  type: number; // 命中的知识类型: 1: 问答, 2: 文档片段
  seg_id?: string; // 片段 ID
}

// 任务流调试信息
interface TaskFlow {
  task_flow_name: string; // 任务流程名称
  task_flow_id: string; // 任务流程 ID
  query_rewrite: string; // 问题改写结果
  hit_intent: string; // 命中的意图
  slot_info: Record<string, any>; // 运行时收集的槽位信息
  api_response: Record<string, any>; // API 节点的返回信息
  type: number; // 任务流程回复类型
}

// 工作流调试信息
interface WorkFlow {
  workflow_name: string; // 工作流名称
  workflow_id: string; // 工作流ID
  qworkflow_run_id: string; // 工作流运行ID
  option_cards: string[]; // 选项卡
  current_node: CurrentNode; // 当前节点信息
  outputs: string; // 输出结果
}

// 当前工作流节点信息
interface CurrentNode {
  NodeID: string; // 节点ID
  NodeType: number; // 节点类型
  NodeName: string; // 节点名称
  Status: number; // 状态
  Input: string; // 节点的输入
  Output: string; // 节点的最终输出
  TaskOutput: string; // 任务的输出
  FailMessage: string; // 异常信息
  CostMilliSeconds: string; // 节点的总耗时
  Reply: string; // 当前节点的回复内容
  BelongNodeID: string; // 节点所属工作流被引用时的引用节点的ID
  StatisticInfo: StatisticInfo; // LLM 统计信息
}

// LLM 统计信息
interface StatisticInfo {
  ModelName: string; // 模型名称
  FirstTokenCost: number; // 首token耗时
  TotalCost: number; // 推理总耗时
  InputTokens: number; // 输入token数量
  OutputTokens: number; // 输出token数量
  TotalTokens: number; // 输入+输出总token
}

// 引用信息
interface QuoteInfo {
  index: number; // 引用的角标索引
  position: number; // 在回复内容中的位置
}

// token统计事件类型定义
interface TokenStatEvent {
  session_id: string; // 会话 id
  request_id: string; // 对应发送事件对应的请求 id
  record_id: string; // 对应发送事件对应的消息记录 id
  status_summary: "processing" | "success" | "failed"; // 本轮对话状态
  status_summary_title: string; // 本轮对话状态描述
  elapsed: number; // 本轮调用耗时, 单位 ms
  token_count: number; // 本轮请求消耗 token 数
  procedures: TokenStatProcedure[]; // 调用过程列表
}

// token统计调用过程
interface TokenStatProcedure {
  name: string; // 英文名
  title: string; // 调用过程描述
  status: "processing" | "success" | "failed"; // 调用过程状态
  input_count: number; // 当次过程输入消耗 token 数
  output_count: number; // 当次过程输出消耗 token 数
  count: number; // 当次过程消耗总 token 数
}

// 参考来源事件类型定义
interface ReferenceEvent {
  record_id: string; // 消息唯一 ID
  references: Reference[]; // 参考来源
}

// 参考来源
interface Reference {
  id: string | number; // 参考来源ID
  type: number; // 参考来源类型: 1：问答, 2：文档片段, 4：联网检索到的内容
  url?: string; // 参考来源链接（仅参考来源类型为文档片段时使用）
  name: string; // 参考来源名称
  doc_id: number; // 参考来源文档 ID
  doc_biz_id: number; // 参考来源文档业务 ID
  doc_name: string; // 参考来源文档名称
  qa_biz_id: string; // 参考来源问答业务 ID
}

// 错误事件类型定义
interface ErrorEvent {
  request_id: string; // 请求 ID
  error: ErrorInfo; // 错误
}

// 错误信息
interface ErrorInfo {
  code: number; // 错误码
  message: string; // 错误信息
}

// 思考事件类型定义
interface ThoughtEvent {
  elapsed: number; // 本轮调用耗时, 单位 ms
  is_workflow: boolean; // 是否工作流
  procedures: ThoughtProcedure[]; // 调用过程列表
  record_id: string; // 对应发送事件对应的消息记录 id
  request_id: string; // 对应发送事件对应的请求 id
  session_id: string; // 会话 id
  trace_id: string; // 链路 id
  workflow_name: string; // 工作流名称
}

// 思考调用过程
interface ThoughtProcedure {
  debugging: Debugging; // 调试过程信息
  index: number; // 过程索引
  name: string; // 英文名
  title: string; // 调用过程描述
  status: "processing" | "success" | "failed"; // 状态
  icon: string; // 图标
  switch: string; // 是否切换Agent
  workflow_name: string; // 工作流名称
  plugin_type: number; // 插件类型: 0: 自定义插件; 1: 官方插件; 2: 工作流
  elapsed: number; // 当前请求执行时间, 单位 ms
}

// 调试过程信息
interface Debugging {
  content: string; // 调试过程中输出的内容
}
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage } from "@langchain/core/messages";
import {
  Command,
  StateGraph,
  END,
  START,
  MemorySaver,
} from "@langchain/langgraph";
import {
  ClientStateAnnotation,
  LanggraphAgent,
} from "@cloudbase/agent-adapter-langgraph";

/**
 * 聊天节点 - LangGraph 工作流的核心节点
 *
 * 负责：
 * 1. 初始化大模型并绑定客户端工具
 * 2. 构造系统提示词
 * 3. 调用大模型生成回复
 * 4. 返回状态更新命令
 *
 * @param {object} state - 当前工作流状态
 * @param {object} config - 运行配置
 * @returns {Command} 状态更新命令
 */
async function chatNode(state, config) {
  // 配置 OpenAI 兼容的大模型
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });

  // 设置默认递归限制，防止无限循环
  const effectiveConfig = config ?? { recursionLimit: 25 };

  // 绑定客户端传入的工具，禁用并行工具调用以保证执行顺序
  const modelWithTools = model.bindTools([...(state.client?.tools || [])], {
    parallel_tool_calls: false,
  });

  // 系统提示词：定义 Agent 的角色和行为
  const systemMessage = new SystemMessage({
    content: "你是一位精通云开发 CloudBase 的专家，擅长回答任何相关的问题。",
  });

  // 调用大模型，传入系统消息和历史对话
  const response = await modelWithTools.invoke(
    [systemMessage, ...state.messages],
    effectiveConfig,
  );

  // 返回 Command，更新消息列表并结束工作流
  return new Command({
    goto: END,
    update: {
      messages: [response],
    },
  });
}

/**
 * 构建 LangGraph 工作流
 *
 * 工作流结构：
 *   START -> chat_node -> END
 *
 * 这是一个简单的单节点工作流，可扩展为多节点复杂流程
 */
const workflow = new StateGraph(ClientStateAnnotation)
  .addNode("chat_node", chatNode)
  .addEdge(START, "chat_node")
  .addEdge("chat_node", END);

/**
 * 编译工作流
 *
 * MemorySaver: 内存级对话历史存储，支持多轮对话上下文
 * 生产环境可替换为持久化存储（如数据库）
 */
const agenticChatGraph = workflow.compile({
  checkpointer: new MemorySaver(),
});

/**
 * 创建 Agent 实例
 *
 * 将编译后的 LangGraph 工作流包装为 AG-UI 兼容的 Agent
 * LanggraphAgent 适配器负责协议转换
 *
 * context 包含以下属性：
 * - request: 当前 HTTP 请求（Web Standard Request）
 * - logger: 日志实例（带 requestId 上下文）
 * - requestId: 请求追踪 ID
 *
 * @type {import("@cloudbase/agent-server").AgentCreator}
 */
export const createAgent = ({ request, logger, requestId }) => {
  // 可以根据 context 实现按请求动态配置，例如：
  // - 从 request 获取用户信息
  // - 根据不同用户使用不同的模型配置
  // - 使用 logger 记录请求日志
  // - 使用 requestId 追踪请求链路

  return {
    agent: new LanggraphAgent({ compiledWorkflow: agenticChatGraph }),
  };
};

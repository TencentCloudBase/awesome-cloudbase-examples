import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { mcpToolToStructuredTool } from "./util";
import { LanguageModelLike } from "@langchain/core/language_models/base";
import { StructuredTool } from "langchain/tools";
import { McpServer } from "./mcp";
import { ChatToolService } from './chat_tool.service.js';
import { AgentContext } from './agent_context.js';
import { McpManager } from './mcp';
import { createSupervisor } from "@langchain/langgraph-supervisor";

/** 聊天工具服务单例 */
let chatToolService: ChatToolService | undefined

/**
 * 获取聊天工具服务实例
 * @param botContext - Agent上下文
 * @returns ChatToolService - 工具服务实例
 */
const getChatToolService = (botContext: AgentContext<{}>) => {
  if (!chatToolService) {
    chatToolService = new ChatToolService(botContext)
  }

  return chatToolService
}

/**
 * 创建Agent描述
 * 根据工具列表自动生成Agent的功能描述
 * @param tools - 工具列表
 * @param llm - 语言模型
 * @returns Promise<string> - Agent描述
 */
async function createAgentDescription(
  tools: StructuredTool[],
  llm: LanguageModelLike
): Promise<string> {
  const prompt = `我在用代码构建一个 Agent，需要一段对 Agent 的描述。我给这个 Agent 提供了一系列的工具，请你帮我据此生成一段对 Agent 的描述吧。你需要精准地告诉他他能做什么事，不要输出 Agent 描述之外的内容。你应该使用第二人称，把这个 Agent 当做你沟通的对象。工具列表如下： ${tools.map((x) => `工具名称：${x.name}，工具描述：${x.description}`).join("\n")}`;
  const res = await llm.invoke(prompt);

  let finalResult: string;

  // 从返回的消息对象中提取字符串内容
  if (typeof res === "string") {
    finalResult = res;
  } else if (res && typeof res.content === "string") {
    finalResult = res.content;
  } else if (res && Array.isArray(res.content)) {
    // 处理多模态内容的情况
    finalResult = res.content
      .map((item: any) => (typeof item === "string" ? item : item.text || ""))
      .join("");
  } else {
    console.warn("Unexpected LLM response format:", res);
    finalResult = String(res?.content || res || "");
  }

  // 调试：打印原始响应和最终结果
  console.log("prompt", prompt);
  console.log("LLM 原始响应:", JSON.stringify(res, null, 2));
  console.log("提取的最终描述:", finalResult);

  return finalResult;
}

/**
 * 创建通用Agent
 * 基于MCP工具创建具有多种能力的通用Agent
 * @param mcpClients - MCP客户端映射
 * @param mcpServerList - MCP服务器列表
 * @param llm - 语言模型
 * @returns Promise<{agent: any, description: string}> - Agent实例和描述
 */
export async function createGeneralAgent(
  mcpClients: Record<string, Client | null>,
  mcpServerList: McpServer[],
  llm: LanguageModelLike
) {
  const structuredToolsArray = await Promise.all(Object.entries(mcpClients).map(async ([mcpServerName, mcpClient]) => {
    const curServer = mcpServerList.find((mcpServer) => mcpServer.name === mcpServerName);
    if (curServer && mcpClient) {
      const { tools } = await mcpClient.listTools();
      const configToolNames = curServer.tools.map((t) => t.name);
      let filteredTools = configToolNames.length ? tools.filter((tool) => curServer.tools.map((t) => t.name).includes(tool.name)) : tools;
      console.log("mcp tools", JSON.stringify(filteredTools, null, 2));
      const structuredTools = filteredTools.map((tool) =>
        mcpToolToStructuredTool(tool, mcpClient!)
      );
      return structuredTools;
    }
    return [];
  }));

  // 动态生成 Agent 描述
  const prompt = await createAgentDescription(structuredToolsArray.flat(), llm);

  return {
    agent: createReactAgent({
      llm,
      tools: structuredToolsArray.flat(),
      prompt,
      name: "generalAgent",
    }),
    description: prompt,
  };
}

/**
 * 生成联网搜索Agent
 * @param llm - 语言模型
 * @param botContext - Agent上下文
 * @returns any - 搜索Agent实例
 */
export const generateSearchAgent = (llm: any, botContext: AgentContext<{}>) => {
  const chatToolService = getChatToolService(botContext)
  const searchNetworkTool = chatToolService.getSearchNetworkTool();
  const searchAgent = createReactAgent({
    llm,
    tools: [searchNetworkTool],
    prompt:
      `你是互联网搜索专家，善于用工具联网搜索，为团队补充最新信息。不要处理进行互联网搜索之外的事情。
        **使用场景：**
        - 用户询问最新信息、实时数据、新闻事件
        - 需要获取当前时间相关的信息
        - 查询股票价格、天气、体育赛事等实时数据
        - 搜索最新的技术资讯、产品发布等
        **触发关键词：** "最新"、"现在"、"今天"、"实时"、"新闻"、"股价"、"天气"等
      `,
    name: "searchNetworkAgent",
  });
  return searchAgent
}

/**
 * 生成文件解析Agent
 * @param llm - 语言模型
 * @param files - 文件列表
 * @param botContext - Agent上下文
 * @returns any - 文件解析Agent实例
 */
export const generateSearchFileAgent = (llm: any, files: any[], botContext: AgentContext<{}>) => {
  const chatToolService = getChatToolService(botContext)
  const searchFileTool = chatToolService.getSearchFileTool(files);
  console.log("🔧 SearchFileAgent 创建，files:", files);
  const searchFileAgent = createReactAgent({
    llm,
    tools: [searchFileTool],
    prompt:
      `你是文件/图片链接解析专家。你的唯一职责就是调用 search_file 工具来解析文件或图片。
      
      **重要规则：**
      1. 收到任何消息后，必须立即调用 search_file 工具
      2. 不要解释、不要道歉、不要说"正在处理"
      3. 直接调用工具获取文件内容，然后基于工具返回的结果回答用户
      4. 如果工具调用失败，告诉用户具体的错误信息
      
      **示例流程：**
      用户："图中有什么？"
      你的行动：立即调用 search_file 工具 → 获取结果 → 基于结果回答
      
      现在立即调用 search_file 工具开始分析文件内容。`,
    name: "searchFileAgent",
  });
  return searchFileAgent
}

/**
 * 生成知识库检索Agent
 * @param llm - 语言模型
 * @param botContext - Agent上下文
 * @returns any - 知识库检索Agent实例
 */
export const generateSearchKnowledgeAgent = (llm: any, botContext: AgentContext<{}>) => {
  const chatToolService = getChatToolService(botContext)
  const searchKnowledgeTool = chatToolService.getSearchKnowledgeTool()
  const searchKnowledgeAgent = createReactAgent({
    llm,
    tools: [searchKnowledgeTool],
    prompt:
      `你是云开发知识库专家，善于用工具检索云开发知识库，为团队提供权威解答。

**重要规则：**
1. 收到任何消息后，必须立即调用 search_knowledge 工具获取知识库内容
2. 不要直接回答用户问题，必须先调用工具
3. 工具调用失败时，才向用户反馈错误信息

**使用场景：**
- 查询企业内部知识库、业务文档、产品手册
- 公司政策、流程规范、标准操作程序
- 专业领域知识、行业最佳实践
- 企业FAQ、内部培训资料、技术规范
- 用户自定义的专业知识内容

**触发关键词：** "如何"、"怎么"、"政策"、"流程"、"规范"、"手册"、"标准"、"最佳实践"、"内部文档"等

**示例流程：**
用户："公司流程规范有哪些？"
你的行动：立即调用 search_knowledge 工具 → 获取结果 → 基于结果回答
`,
    name: "searchKnowledgeAgent",
  });
  return searchKnowledgeAgent
}

/**
 * 生成数据库查询Agent
 * @param llm - 语言模型
 * @param botContext - Agent上下文
 * @returns any - 数据库查询Agent实例
 */
export const generateSearchDatabaseAgent = (llm: any, botContext: AgentContext<{}>) => {
  const chatToolService = getChatToolService(botContext)
  const searchDatabaseTool = chatToolService.getSearchDatabaseTool()
  const searchDatabaseAgent = createReactAgent({
    llm,
    tools: [searchDatabaseTool],
    prompt:
      `你是云开发数据模型专家，善于用工具检索云开发数据模型，为团队提供权威解答。
**重要规则：**
1. 收到任何消息后，必须立即调用 search_database 工具获取数据
2. 不要直接回答用户问题，必须先调用工具
3. 工具调用失败时，才向用户反馈错误信息
**使用场景：**
- 查询结构化业务数据、用户数据、订单信息等
- 统计分析、数据报表需求
- 历史交易记录、用户行为数据查询
- 需要精确的数据库查询结果
**触发关键词：** "查询"、"统计"、"数据"、"记录"、"订单"、"用户信息"、"历史"等
`,
    name: "searchDatabaseAgent",
  });
  return searchDatabaseAgent
}

/**
 * 生成MCP Agent
 * @param llm - 语言模型
 * @param botContext - Agent上下文
 * @returns Promise<any> - MCP Agent实例
 */
export const generateMcpAgent = async (llm: any, botContext: AgentContext<{}>) => {
  const mcpManager = new McpManager(botContext);
  const mcpClients = await mcpManager.initMCPClientMap();
  const mcpAgent = await createGeneralAgent(mcpClients, mcpManager.mcpServers, llm);
  return mcpAgent
}

/**
 * 生成Worker Agents
 * 根据配置生成所有可用的专业Agent
 * @param llm - 语言模型
 * @param botContext - Agent上下文
 * @returns any[] - Worker Agents数组
 */
export const generateWorkerAgents = (llm: any, botContext: AgentContext<any>) => {
  const agents = []
  botContext.info.searchNetworkEnable && agents.push(generateSearchAgent(llm, botContext));
  botContext.info.knowledgeBase?.length && agents.push(generateSearchKnowledgeAgent(llm, botContext));
  botContext.info.databaseModel?.length && agents.push(generateSearchDatabaseAgent(llm, botContext));
  return agents;
}

/**
 * 生成Supervisor Agent
 * 创建智能调度器，负责分配任务给合适的Worker Agent
 * @param agents - Worker Agents数组
 * @param llm - 语言模型
 * @returns any - Supervisor Agent实例
 */
export const generateSupervisorAgent = (agents: any[], llm: any) => {
  // Supervisor prompt
  let supervisorPrompt =
    "你拥有一个强大的 Agent 团队。" +
    "对于互联网搜索相关的问题，交给 searchNetworkAgent。" +
    "对于云开发知识库相关的问题，交给 searchKnowledgeAgent。" +
    "对于云开发数据模型相关的问题，交给 searchDatabaseAgent。";

  console.log(
    "🤖 准备的 agents:",
    agents.map((x) => x.name)
  );
  console.log("📝 Supervisor prompt:", supervisorPrompt);
  return createSupervisor({
    agents,
    llm,
    prompt: supervisorPrompt,
  }).compile();
}



import { BotRunner } from "@cloudbase/aiagent-framework";
import { TcbEventFunction } from "@cloudbase/functions-typings";
import { AgentWrapper } from "./agent.js";
import { filterLog, getApiKey } from "./lib/util.js";
import { AgentContext } from './lib/agent_context.js';
import { agentConfig } from './lib/agent_config.js';
import { AgentInfo } from './lib/agent_info.js';
import { generateWorkerAgents, generateSupervisorAgent } from './lib/generalAgent.js'
import { createDeepseek } from './lib/llm.js'

// 过滤控制台警告信息，减少不必要的日志输出
filterLog();

/**
 * 云函数主入口函数
 * 负责初始化多Agent协作系统，包括Worker Agents和Supervisor Agent
 * @param event - 云函数事件对象
 * @param context - 云函数上下文对象
 * @returns Promise<void> - 执行结果
 */
export const main: TcbEventFunction<unknown> = async function (event, context) {
  // 创建Agent包装器实例，用于管理多Agent协作
  const agentWrapper = new AgentWrapper(context)
  const agentId = agentWrapper.botId;

  // 获取云开发环境ID和API密钥
  const envId =
    context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID;
  !envId &&
    console.warn(
      "Missing envId, if running locally, please configure \`CLOUDBASE_ENV_ID\` environment variable."
    );
  const apiKey = getApiKey(context)

  // 初始化Agent上下文，包含配置、信息和Agent实例
  const agentContext = new AgentContext(context, {});
  agentContext.config = Object.assign({}, agentConfig);
  agentContext.info = new AgentInfo(agentId, agentConfig);
  agentContext.agent = agentWrapper;

  // 创建Worker Agents的LLM实例和Agent集合
  const workerAgentLLM = createDeepseek(envId, agentContext.config.model, apiKey);
  const workerAgents = generateWorkerAgents(workerAgentLLM, agentContext)

  // 创建Supervisor Agent的LLM实例和调度器
  const superVisorAgentLLM = createDeepseek(envId, agentContext.config.model, apiKey);
  const superVisorAgent = generateSupervisorAgent(workerAgents, superVisorAgentLLM)

  // 将Worker Agents和Supervisor Agent设置到包装器中
  agentWrapper.setAgent(workerAgents, superVisorAgent)

  // 启动 Agent运行器，处理用户请求
  return BotRunner.run(event, context, agentWrapper);
};
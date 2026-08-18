import { BotRunner } from "@cloudbase/aiagent-framework";
import { TcbEventFunction } from "@cloudbase/functions-typings";
import { AgentWrapper } from "./agent";
import { getApiKey, createDeepseek } from './lib/utils'
import { AgentContext } from './lib/agent_context'
import { agentConfig } from './lib/agent_config'
import { AgentInfo } from './lib/agent_info'
import { generateAgentTools } from './lib/agent_tools'

export const main: TcbEventFunction<unknown> = async function (event, context) {
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

  // 构建 LLM
  const agentLLM = await createDeepseek(envId as string, agentContext.config.model, apiKey);

  // 构建 Tools
  const agentTools = generateAgentTools(agentContext)

  // 构建 agent
  const agent = agentLLM.bindTools(agentTools.tools)

  agentWrapper.setAgentAndTools(agent, agentTools.toolsByName, agentTools.tools)
  agentWrapper.setAgentContext(agentContext)

  return BotRunner.run(event, context, agentWrapper);
};

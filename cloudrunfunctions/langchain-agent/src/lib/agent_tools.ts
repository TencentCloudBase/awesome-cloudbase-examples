import { ChatToolService } from './chat_tool.service';
import { AgentContext } from './agent_context';

let chatToolService: ChatToolService | undefined

/**
 * 获取聊天工具服务实例
 * @param agentContext - Agent上下文
 * @returns ChatToolService - 工具服务实例
 */
const getChatToolService = (agentContext: AgentContext<{}>) => {
  if (!chatToolService) {
    chatToolService = new ChatToolService(agentContext)
  }

  return chatToolService
}

export const generateAgentTools = (agentContext: AgentContext<{}>) => {
  const chatToolService = getChatToolService(agentContext)
  const tools = []
  const toolsByName: any = {}
  if (agentContext.info.searchNetworkEnable) {
    const searchNetworkTool = chatToolService.getSearchNetworkTool();
    tools.push(searchNetworkTool);
    toolsByName.search_network = searchNetworkTool;
  }

  if (agentContext.info.databaseModel) {
    const searchDatabaseTool = chatToolService.getSearchDatabaseTool();
    tools.push(searchDatabaseTool);
    toolsByName.search_database = searchDatabaseTool;
  }

  if (agentContext.info.knowledgeBase) {
    const searchKnowledgeTool = chatToolService.getSearchKnowledgeTool()
    tools.push(searchKnowledgeTool);
    toolsByName.search_knowledge = searchKnowledgeTool;
  }

  return { tools, toolsByName }
}
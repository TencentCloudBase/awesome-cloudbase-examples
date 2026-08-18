import { AgentConfig } from "./agent_config";
import { McpServer } from "./mcp";

/**
 * Agent信息类
 * 存储Agent的基本信息和配置
 */
export class AgentInfo {
  /** Agent类型 */
  type!: string;
  /** Agent ID */
  agentId: string;
  /** Agent名称 */
  name: string;
  /** Agent设置 */
  agentSetting: string;
  /** Agent介绍 */
  introduction: string;
  /** 初始问题列表 */
  initQuestions!: string[];
  /** 是否启用网络搜索 */
  searchNetworkEnable: boolean;
  /** 是否启用文件搜索 */
  searchFileEnable: boolean;
  /** 知识库列表 */
  knowledgeBase: string[];
  /** 数据模型列表 */
  databaseModel: string[];
  /** MCP服务器列表 */
  mcpServerList: McpServer[];


  /**
   * 构造函数
   * @param agentId - Agent ID
   * @param agentConfig - Agent配置对象
   */
  constructor(agentId: string, agentConfig: AgentConfig) {
    this.agentId = agentId;
    this.name = agentConfig.name;
    this.agentSetting = agentConfig.agentSetting;
    this.introduction = agentConfig.introduction;
    this.searchNetworkEnable = agentConfig.searchNetworkEnable;
    this.searchFileEnable = agentConfig.searchFileEnable;
    this.databaseModel = agentConfig.databaseModel;
    this.knowledgeBase = agentConfig.knowledgeBase;
    this.mcpServerList = agentConfig.mcpServerList;
  }
}

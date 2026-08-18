import { IBotConfig } from './bot_config'
import { McpServer } from './mcp'

export class BotInfo {
  type: string
  botId: string
  name: string
  agentSetting: string
  introduction: string
  initQuestions: string
  searchNetworkEnable: boolean
  searchFileEnable: boolean
  knowledgeBase: string[]
  databaseModel: string[]
  mcpServerList: McpServer[]

  constructor (botId: string, botConfig: IBotConfig) {
    this.botId = botId
    this.name = botConfig.name
    this.agentSetting = botConfig.agentSetting
    this.introduction = botConfig.introduction
    this.searchNetworkEnable = botConfig.searchNetworkEnable
    this.searchFileEnable = botConfig.searchFileEnable
    this.databaseModel = botConfig.databaseModel
    this.knowledgeBase = botConfig.knowledgeBase
    this.mcpServerList = botConfig.mcpServerList
  }
}

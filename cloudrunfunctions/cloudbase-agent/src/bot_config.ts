import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'

import { McpServer } from './mcp'

export interface IBotConfig {
  name: string;
  model: string;
  baseURL: string;
  apiKey?: string;
  agentSetting: string;
  introduction: string;
  welcomeMessage: string;
  avatar: string;
  type: string;
  isNeedRecommend: boolean;
  searchNetworkEnable: boolean;
  searchFileEnable: boolean;
  knowledgeBase: string[];
  databaseModel: string[];
  initQuestions: string[];
  mcpServerList: McpServer[];
  voiceSettings?: {
    enable?: boolean;
    inputType?: string;
    outputType?: number;
  };
  multiConversationEnable: boolean;
}

export class BotConfig {
  static instance: BotConfig
  data: IBotConfig

  constructor () {
    if (BotConfig.instance) {
      return BotConfig.instance
    }
    BotConfig.instance = this

    // 读取配置文件，并解析到data中
    try {
      const yamlData = fs.readFileSync(
        path.join(__dirname, '..', 'bot-config.yaml'),
        'utf8'
      )
      this.data = yaml.load(yamlData) as IBotConfig

      console.log('BotConfig loaded:', this.data)
    } catch (err) {
      console.error('Error reading or parsing file:', err)
    }
  }

  getData (): IBotConfig {
    return this.data
  }

  setData (key, value) {
    this.data[key] = value
  }
}

export const botConfig: IBotConfig = new BotConfig().getData()

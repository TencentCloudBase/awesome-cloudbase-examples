import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'

import { McpServer } from '../llm/mcp.js'

export interface IBotConfig {
  name: string
  model: string
  baseURL: string
  apiKey?: string
  agentSetting: string
  introduction: string
  welcomeMessage: string
  avatar: string
  type: string
  isNeedRecommend: boolean
  searchNetworkEnable: boolean
  searchFileEnable: boolean
  knowledgeBase: string[]
  databaseModel: string[]
  initQuestions: string[]
  mcpServerList: McpServer[]
  voiceSettings?: {
    enable?: boolean
    inputType?: string
    outputType?: number
  }
  multiConversationEnable: boolean
}

// 默认配置
const defaultConfig: IBotConfig = {
  name: 'Cloudbase Agent',
  model: '',
  baseURL: '',
  agentSetting: '你是一个有帮助的助手。',
  introduction: '我是 Cloudbase Agent，有什么可以帮到您？',
  welcomeMessage: '您好！我是 Cloudbase Agent，有什么可以帮到您？',
  avatar: '',
  type: 'text',
  isNeedRecommend: false,
  searchNetworkEnable: false,
  searchFileEnable: false,
  knowledgeBase: [],
  databaseModel: [],
  initQuestions: [],
  mcpServerList: [],
  multiConversationEnable: false
}

export class BotConfig {
  static instance: BotConfig
  data!: IBotConfig

  constructor() {
    if (BotConfig.instance) {
      return BotConfig.instance
    }
    BotConfig.instance = this

    // 读取配置文件，并解析到data中
    try {
      const configPath = path.join(process.cwd(), 'bot-config.yaml')

      let configLoaded = false
      if (fs.existsSync(configPath)) {
        const yamlData = fs.readFileSync(configPath, 'utf8')
        this.data = yaml.load(yamlData) as IBotConfig
        console.log('BotConfig loaded from:', configPath)
        configLoaded = true
      }

      if (!configLoaded) {
        console.log('No bot-config.yaml found, using default config')
        this.data = defaultConfig
      }
    } catch (err) {
      console.error('Error reading or parsing file:', err)
      this.data = defaultConfig
    }
  }

  getData(): IBotConfig {
    return this.data
  }

  setData(key: keyof IBotConfig, value: unknown) {
    (this.data as Record<keyof IBotConfig, unknown>)[key] = value
  }
}

export const botConfig: IBotConfig = new BotConfig().getData()

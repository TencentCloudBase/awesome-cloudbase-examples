import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { McpServer } from './mcp';

/**
 * Agent配置接口
 * 定义Agent的所有配置属性
 */
export interface AgentConfig {
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
  knowledgeBase: any[];
  databaseModel: any[];
  initQuestions: string[];
  mcpServerList: McpServer[];
}

/**
 * Agent配置管理类
 * 单例模式，负责读取和管理YAML配置文件
 */
export class AgentConfig {
  /** 单例实例 */
  static instance: any;
  /** 配置数据对象 */
  data!: AgentConfig;

  /**
   * 构造函数
   * 实现单例模式，读取YAML配置文件
   */
  constructor() {
    if (AgentConfig.instance) {
      return AgentConfig.instance;
    }
    AgentConfig.instance = this;

    // 读取配置文件，并解析到data中
    try {
      const yamlData = fs.readFileSync(path.join(__dirname, '../..', 'agent-config.yaml'), 'utf8');
      const yData: AgentConfig = yaml.load(yamlData) as AgentConfig;
      console.log('yaml:', yData);
      // 初始化其他属性
      this.data = yData;
    } catch (err) {
      console.error('Error reading or parsing file:', err);
    }
  }

  /**
   * 获取配置数据
   * @returns AgentConfig - 配置对象
   */
  getData(): AgentConfig {
    return this.data;
  }

  /**
   * 设置配置数据
   * @param key - 配置键名
   * @param value - 配置值
   */
  setData(key: string, value: any) {
    this.data[key] = value;
  }
}

/** 全局Agent配置实例 */
export const agentConfig: AgentConfig = (new AgentConfig()).getData();
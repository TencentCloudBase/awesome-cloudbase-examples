import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

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
}

export class AgentConfig {
  static instance: any;
  data!: AgentConfig;

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

  getData(): AgentConfig {
    return this.data;
  }

  setData(key: string, value: any) {
    this.data[key] = value;
  }
}

export const agentConfig: AgentConfig = (new AgentConfig()).getData();

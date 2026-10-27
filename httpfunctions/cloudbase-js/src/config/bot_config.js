"use strict";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
const defaultConfig = {
  name: "Cloudbase Agent",
  model: "",
  baseURL: "",
  agentSetting: "你是一个有帮助的助手。",
  introduction: "我是 Cloudbase Agent，有什么可以帮到您？",
  welcomeMessage: "您好！我是 Cloudbase Agent，有什么可以帮到您？",
  avatar: "",
  type: "text",
  isNeedRecommend: false,
  searchNetworkEnable: false,
  searchFileEnable: false,
  knowledgeBase: [],
  databaseModel: [],
  initQuestions: [],
  mcpServerList: [],
  multiConversationEnable: false
};
export class BotConfig {
  static instance;
  data;
  constructor() {
    if (BotConfig.instance) {
      return BotConfig.instance;
    }
    BotConfig.instance = this;
    try {
      const configPath = path.join(process.cwd(), "bot-config.yaml");
      let configLoaded = false;
      if (fs.existsSync(configPath)) {
        const yamlData = fs.readFileSync(configPath, "utf8");
        this.data = yaml.load(yamlData);
        console.log("BotConfig loaded from:", configPath);
        configLoaded = true;
      }
      if (!configLoaded) {
        console.log("No bot-config.yaml found, using default config");
        this.data = defaultConfig;
      }
    } catch (err) {
      console.error("Error reading or parsing file:", err);
      this.data = defaultConfig;
    }
  }
  getData() {
    return this.data;
  }
  setData(key, value) {
    this.data[key] = value;
  }
}
export const botConfig = new BotConfig().getData();

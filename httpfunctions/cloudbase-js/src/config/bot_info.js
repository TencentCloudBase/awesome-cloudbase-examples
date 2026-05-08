"use strict";
export class BotInfo {
  type;
  botId;
  name;
  agentSetting;
  introduction;
  initQuestions;
  searchNetworkEnable;
  searchFileEnable;
  knowledgeBase;
  databaseModel;
  mcpServerList;
  constructor(botId, botConfig) {
    this.botId = botId;
    this.type = botConfig.type;
    this.name = botConfig.name;
    this.initQuestions = botConfig.initQuestions;
    this.agentSetting = botConfig.agentSetting;
    this.introduction = botConfig.introduction;
    this.searchNetworkEnable = botConfig.searchNetworkEnable;
    this.searchFileEnable = botConfig.searchFileEnable;
    this.databaseModel = botConfig.databaseModel;
    this.knowledgeBase = botConfig.knowledgeBase;
    this.mcpServerList = botConfig.mcpServerList;
  }
}

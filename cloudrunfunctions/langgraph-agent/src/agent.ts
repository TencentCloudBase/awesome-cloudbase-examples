import { BotCore, IBot, SendMessageInput, GetBotInfoOutput } from "@cloudbase/aiagent-framework";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createGeneralAgent } from "./lib/generalAgent.js";
import { llmCallback } from "./lib/util.js";
import { omit } from "remeda";
import { ChatToolService } from './lib/chat_tool.service.js';
import { AgentContext } from './lib/agent_context.js';
import { agentConfig } from './lib/agent_config.js';

/**
 * Agent包装器类
 * 继承自BotCore，实现IBot接口，负责管理多Agent协作系统
 * 包括Worker Agents和Supervisor Agent的协调工作
 */
export class AgentWrapper extends BotCore implements IBot {
  /** Agent上下文对象，包含配置、信息和状态 */
  agentContext!: AgentContext<any>;
  /** MCP客户端实例，用于调用外部工具 */
  private mcpClient: Client | null = null;
  /** MCP Agent对象 */
  private mcpAgentObj: any = null
  /** Worker Agents数组，包含各种专业Agent */
  private workerAgents: any[] = [];
  /** Supervisor Agent实例，负责智能调度 */
  private supervisorAgent: any = null;
  /**
   * 构造函数
   * @param context - 云函数上下文对象
   */
  constructor(context: any) {
    super(context);
  }

  /**
   * 设置Agent实例
   * @param workerAgents - Worker Agents数组
   * @param superVisorAgent - Supervisor Agent实例
   */
  setAgent(workerAgents: any[], superVisorAgent: any) {
    this.workerAgents = workerAgents
    this.supervisorAgent = superVisorAgent
  }

  /**
   * 生成输入消息
   * 根据用户输入和文件列表构建HumanMessage对象
   * @param msg - 用户文本消息
   * @param files - 文件链接数组
   * @returns HumanMessage - 构建好的消息对象
   */
  generateInputMessage({ msg, files = [] }: { msg: string; files: string[] }): HumanMessage {
    const humanMessage = files.length ? new HumanMessage({
      content: [
        { type: "text", text: msg + `\n\n用户上传的文件链接：${files.join('\n')}` },
        ...files.map((file: string) => {
          const fileExtension = file.split('.').pop()?.toLowerCase() || '';
          const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

          if (imageExtensions.includes(fileExtension)) {
            // 图片文件使用 image_url 格式
            return { type: "image_url", image_url: { url: file } };
          } else {
            // 非图片文件使用 file 描述格式
            return {
              type: "file",
              source_type: "url",
              url: file,
            };
          }
        }),
        // ...files.map((file: string) => ({ type: "image", source_type: "url", url: file })),
      ]
    }) : new HumanMessage(msg)

    console.log("📨 构建的 humanMessage:", JSON.stringify(humanMessage, null, 2));
    return humanMessage
  }

  /**
   * 创建DeepSeek LLM实例
   * @param envId - 云开发环境ID
   * @returns ChatDeepSeek - 配置好的LLM实例
   */
  createDeepseek(envId: string) {
    return new ChatDeepSeek({
      streaming: true,
      model: agentConfig.model,
      apiKey: this.apiKey,
      configuration: {
        baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
      },
      callbacks: [llmCallback],
    });
  }

  /**
   * 发送消息处理函数
   * 协调多Agent协作，处理用户输入并返回流式响应
   * @param msg - 用户消息内容
   * @param files - 文件列表
   * @returns Promise<void>
   */
  async sendMessage({ msg, files = [] }: SendMessageInput): Promise<void> {
    const envId =
      this.context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID;
    console.log("supervisorAgent", this.supervisorAgent)
    if (this.supervisorAgent && this.workerAgents) {
      const humanMessage = this.generateInputMessage({ msg, files })

      // 启动协作，无需流式
      const result = await this.supervisorAgent.invoke({
        messages: [humanMessage],
      });

      console.log("✅ Supervisor 协作完成");
      console.log("📋 最终 messages 数量:", result.messages?.length || 0);
      console.log("📋 最终 messages:", result.messages?.map((m: any) => ({
        type: m.constructor.name,
        content: typeof m.content === 'string' ? m.content.substring(0, 100) + '...' : '[非文本内容]',
        additional_kwargs: m.additional_kwargs
      })));

      // 用 finalMessages 作为 prompt，流式总结
      const streamingLLM = this.createDeepseek(envId);
      const summaryStream = await streamingLLM.stream(result.messages);
      let debugContent = ''

      for await (const chunk of summaryStream) {
        debugContent += chunk.content as string;
        // console.log(
        //   "summary chunk",
        //   omit(chunk, [
        //     "response_metadata",
        //     "usage_metadata",
        //     "lc_kwargs",
        //     "additional_kwargs",
        //     "lc_namespace",
        //     "lc_serializable",
        //   ])
        // );
        this.sseSender.send({
          data: {
            content: chunk.content as string,
            role: "assistant",
            type: "text",
            model: "deepseek-v3-0324",
            finish_reason: "",
          },
        });
      }

      console.log("debugContent", debugContent);
    }

    this.sseSender.end();
  }

  /**
   * 获取API密钥
   * 从上下文或环境变量中提取并格式化accessToken
   * @returns string - 格式化后的API密钥
   */
  get apiKey() {
    const accessToken =
      this.context?.extendedContext?.accessToken ||
      process.env.CLOUDBASE_API_KEY;
    if (typeof accessToken !== "string") {
      throw new Error("Invalid accessToken");
    }

    return accessToken.replace("Bearer", "").trim();
  }

  /**
   * 获取Bot信息
   * 返回Agent的配置信息，包括名称、模型、设置等
   * @returns Promise<GetBotInfoOutput> - Bot信息对象
   */
  async getBotInfo(): Promise<GetBotInfoOutput> {
    const agentInfo: GetBotInfoOutput = {
      botId: this.botId,
      name: agentConfig.name,
      model: agentConfig.model,
      agentSetting: agentConfig.agentSetting,
      introduction: agentConfig.introduction,
      welcomeMessage: agentConfig.welcomeMessage,
      avatar: agentConfig.avatar,
      isNeedRecommend: agentConfig.isNeedRecommend,
      knowledgeBase: agentConfig.knowledgeBase,
      databaseModel: agentConfig.databaseModel,
      initQuestions: agentConfig.initQuestions,
      searchEnable: agentConfig.searchNetworkEnable,
      searchFileEnable: agentConfig.searchFileEnable,
      mcpServerList: agentConfig.mcpServerList as any,
    };

    return agentInfo;
  }
}

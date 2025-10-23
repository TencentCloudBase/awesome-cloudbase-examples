import { BotCore, IBot, SendMessageInput, GetBotInfoOutput } from "@cloudbase/aiagent-framework";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatToolService } from './lib/chat_tool.service';

import { AgentContext } from './lib/agent_context';
import { agentConfig } from './lib/agent_config';
import { AgentInfo } from './lib/agent_info';
import { logIfError } from './lib/utils'

/**
 * 扩展的消息输入接口
 * 在基础 SendMessageInput 基础上添加文件支持
 */
interface ExtendedSendMessageInput extends SendMessageInput {
  /** 文件链接数组，支持图片和文档文件 */
  files?: string[];
}

/**
 * Agent包装器类
 * 继承自BotCore，实现IBot接口，负责管理Agent和工具的执行
 * 支持图文混合消息处理和流式输出
 */
export class AgentWrapper extends BotCore implements IBot {
  /** 聊天工具服务实例，提供各种工具功能 */
  chatToolService!: ChatToolService;
  /** Agent工具列表 */
  private agentTools: any[] = []
  /** 工具名称映射表，用于快速查找工具 */
  private toolsByName: any = {}
  /** Agent实例 */
  private agent: any
  /** Agent上下文，包含配置和状态信息 */
  agentContext!: AgentContext<any>;

  /**
   * 构造函数
   * @param context - 云函数上下文对象
   */
  constructor(context: any) {
    super(context)
  }

  /**
   * 设置Agent和工具
   * @param agent - Agent实例
   * @param toolsByName - 工具名称映射表
   * @param agentTools - 工具列表
   */
  setAgentAndTools(agent: any, toolsByName: any, agentTools: any[]) {
    this.agent = agent;
    this.toolsByName = toolsByName;
    this.agentTools = agentTools;
  }

  /**
   * 设置Agent上下文
   * @param agentContext - Agent上下文对象
   */
  setAgentContext(agentContext: AgentContext<any>) {
    this.agentContext = agentContext
  }

  /**
   * 发送消息处理函数
   * 处理用户输入，执行Agent推理，调用工具，并返回流式响应
   * @param msg - 用户消息内容
   * @param files - 文件链接数组
   * @returns Promise<void>
   */
  async sendMessage({ msg, files = [] }: ExtendedSendMessageInput): Promise<void> {
    // 获取云开发环境ID
    const envId =
      this.context.extendedContext?.envId || process.env.CLOUDBASE_ENV_ID;

    !envId &&
      console.warn(
        "Missing envId, if running locally, please configure \`CLOUDBASE_ENV_ID\` environment variable."
      );

    // 创建流式LLM实例，用于最终答案的流式输出
    const streamingLLM = await logIfError(
      () =>
        new ChatDeepSeek({
          streaming: true,
          model: "deepseek-v3-0324",
          apiKey: this.apiKey,
          configuration: {
            baseURL: `https://${envId}.api.tcloudbasegateway.com/v1/ai/deepseek/v1`,
          },
        }),
      (e) => console.error(`create streaming deepseek failed`, e)
    );

    if (this.agent) {
      // 构建系统提示词，包含详细的工具使用说明和策略
      const systemPrompt = `
          【角色】你将会扮演 ${this.agentContext?.info.name}
          【设定和要求】${this.agentContext?.info?.agentSetting}，
           同时你拥有最多以下4种专业工具来帮助用户解决问题。请根据用户的问题类型和需求，智能选择合适的工具：
      
      ## 可用工具说明：
      
      ### 1. 联网搜索工具 (search_network)
      **使用场景：**
      - 用户询问最新信息、实时数据、新闻事件
      - 需要获取当前时间相关的信息
      - 查询股票价格、天气、体育赛事等实时数据
      - 搜索最新的技术资讯、产品发布等
      **触发关键词：** "最新"、"现在"、"今天"、"实时"、"新闻"、"股价"、"天气"等
      
      ### 2. 文件/图片链接解析识别工具 (search_file)
      **使用场景：**
      - **重要：当用户消息中包含任何类型的文件链接时，必须优先调用此工具进行文件分析**
      **调用规则：**
      - 如果用户消息中包含任何文件链接，都必须首先调用此工具
      - 即使用户只是问"这个文件里有什么"、"分析这个文档"、"识别这个图片"等问题，也要调用工具
      **触发关键词：** "文件"、"上传"、"图片"、"文档"、"音频"、"视频"、"PDF"、"表格"、"识别"、"解析"、"分析这个文件"、"文件中有什么"等
      
      ### 3. 数据库检索工具 (search_database)
      **使用场景：**
      - 查询结构化业务数据、用户数据、订单信息等
      - 统计分析、数据报表需求
      - 历史交易记录、用户行为数据查询
      - 需要精确的数据库查询结果
      **触发关键词：** "查询"、"统计"、"数据"、"记录"、"订单"、"用户信息"、"历史"等
      
      ### 4. 知识库检索工具 (search_knowledge)
      **使用场景：**
      - 查询企业内部知识库、业务文档、产品手册
      - 公司政策、流程规范、标准操作程序
      - 专业领域知识、行业最佳实践
      - 企业FAQ、内部培训资料、技术规范
      - 用户自定义的专业知识内容
      **触发关键词：** "如何"、"怎么"、"政策"、"流程"、"规范"、"手册"、"标准"、"最佳实践"、"内部文档"等
      
      ## 工具选择策略：
      
      1. **优先级判断：**
         - **最高优先级：如果用户消息中包含任何文件链接（图片、文档等）→ 必须先调用文件链接解析工具**
         - 如果询问最新/实时信息 → 使用联网搜索工具
         - 如果询问具体数据查询 → 使用数据库检索工具
         - 如果询问业务知识/内部文档/流程规范 → 使用知识库检索工具
      
      2. **文件处理规则：**
         - 当接收到包含任何类型文件链接的消息时，不管用户的文字问题是什么，都要先调用 search_file 工具分析文件
         - 基于工具返回的文件分析结果，再结合用户的问题给出完整回答
         - 不要直接回答文件相关问题而不调用工具
      
      3. **组合使用：**
         - 可以根据需要组合使用多个工具
         - 先用文件解析工具分析用户上传的文件链接，再用知识库查询相关业务信息进行对比
         - 先用数据库查询具体数据，再结合知识库提供业务解释
      
      4. **无工具场景：**
         - 简单的对话、闲聊、数学计算等可以直接回答
         - 不需要外部信息的问题直接基于已有知识回答
      
      请根据用户的具体问题，智能选择合适的工具来提供最准确和有用的回答。特别注意：如果消息中包含任何格式的文件，必须调用 search_file 工具！`;

      // 构建用户消息，支持图文混合内容
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

      // 构建完整的消息数组，包含系统提示词和用户消息
      const messages = [new SystemMessage(systemPrompt), humanMessage];

      // 添加调试信息，便于问题排查
      console.log('=== 调试信息 ===');
      console.log('可用工具数量:', this.agentTools.length);
      console.log('工具名称:', this.agentTools.map(t => t.name));
      console.log('用户消息包含文件数量:', files.length);
      console.log('构建的消息:', JSON.stringify(messages, null, 2));
      console.log('===============');

      // 调用Agent进行推理，获取AI响应和工具调用
      const aiMessage = await logIfError(() => this.agent.invoke(messages), (e) => console.error(`invoke llm failed`, e, messages))
      console.log('AI 响应:', aiMessage);
      console.log('工具调用:', aiMessage.tool_calls);
      messages.push(aiMessage);

      // 执行工具调用，处理AI选择的工具
      for (const toolCall of aiMessage.tool_calls as any) {
        const selectedTool = this.toolsByName[toolCall.name];
        if (!selectedTool) {
          console.error(`Tool ${toolCall.name} not found`);
          continue;
        }
        const toolMessage = await logIfError(() => selectedTool.invoke(toolCall), (e) => console.error(`invoke tool failed`, e, toolCall))
        messages.push(toolMessage);
      }

      console.log('最终消息数组', messages);

      // 使用流式LLM生成最终答案，提供良好的用户体验
      const finalStream = await logIfError(() => streamingLLM.stream(messages), (e) => console.error(`stream llm failed`, e, messages))
      let fullResponse = "";

      try {
        // 处理流式输出，实时发送给用户
        for await (const chunk of finalStream) {
          // 确保 content 是字符串类型
          const content = typeof chunk.content === 'string' ? chunk.content : '';
          fullResponse += content;
          console.log("流式输出chunk", content)

          // 发送流式内容给用户
          this.sseSender.send({
            data: {
              content: content,
              role: 'assistant',
              type: 'text',
              model: "deepseek-v3-0324",
              finish_reason: "",
            },
          });
        }
      } catch (streamError) {
        // 处理流式输出错误
        console.error('Stream processing error:', streamError);
        this.sseSender.send({
          data: {
            content: "\n\n抱歉，处理您的请求时发生了错误。",
            role: 'assistant',
            type: 'text',
            model: "deepseek-v3-0324",
            finish_reason: "error",
          },
        });
      } finally {
        // 输出完整响应并结束流式连接
        console.log('完整响应', fullResponse);
        this.sseSender.end();
      }
    }
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
    const botInfo: GetBotInfoOutput = {
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
    };

    return botInfo;
  }
}
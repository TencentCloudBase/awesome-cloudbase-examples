import { ContextInjected, TcbExtendedContext } from '@cloudbase/functions-typings';
import { CloudbaseMcpServer } from '@cloudbase/mcp/server';
import tcb from '@cloudbase/node-sdk';
import CloudBase from "@cloudbase/manager-node";
import { z } from 'zod';
import OpenAI from 'openai'
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import crypto from 'crypto'

export function createServer(context: ContextInjected<TcbExtendedContext>) {
  const server = new CloudbaseMcpServer(
    {
      name: 'Basic Server',
      version: '1.0.0',
    },
    { capabilities: { tools: {} } },
  );
  const apiKey = getApiKey(context)

  const env = context.extendedContext?.envId || process.env.ENV_ID; // 本地开发从环境变量读
  const secretId = context.extendedContext?.tmpSecret?.secretId || process.env.TENCENTCLOUD_SECRETID;
  const secretKey = context.extendedContext?.tmpSecret?.secretKey || process.env.TENCENTCLOUD_SECRETKEY;
  const sessionToken = context.extendedContext?.tmpSecret?.token;
  const TASK_DB = 'ai_agent_tasks'
  const hunYuanClient = new OpenAI({
    apiKey: apiKey,
    baseURL: `https://${env}.api.tcloudbasegateway.com/v1/ai/hunyuan-beta/openapi/v1/`,
  });
  const deepSeekClient = new OpenAI({
    apiKey: apiKey,
    baseURL: `https://${env}.api.tcloudbasegateway.com/v1/ai/deepseek/v1/`,
  });
  const botClient = new OpenAI({
    apiKey: apiKey,
    baseURL: `https://${env}.api.tcloudbasegateway.com/v1/aibot/bots/`,
  })

  // 创建 Cloudbase Node sdk 实例
  const app = tcb.init({
    env,
    secretId,
    secretKey,
    sessionToken,
  });

  const cloudbaseManager = new CloudBase({
    secretId,
    secretKey,
    envId: env,
    token: sessionToken,
  });


  makeSureDbCollection(cloudbaseManager, TASK_DB)


  server
    .tool('planTask')
    .description('根据用户需求创建任务并规划子任务')
    .inputSchema({
      requirement: z.string().describe('用户需求描述'),
      taskName: z.string().describe('任务名称'),
    })
    .outputSchema({
      taskId: z.string().describe('创建的任务ID'),
      task: z.object({
        name: z.string().describe('任务名称'),
        status: z.string().describe('任务状态'),
        priority: z.number().describe('任务优先级(1-5, 5最高)'),
        products: z.array(z.string()).describe('产物列表'),
        subTasks: z.array(
          z.object({
            name: z.string().describe('子任务名称'),
            status: z.string().describe('子任务状态'),
            priority: z.number().describe('子任务优先级(1-5, 5最高)'),
            products: z.array(z.string()).describe('产物列表'),
            dependencies: z.array(z.number()).describe('依赖的子任务索引列表'),
          }),
        ).describe('子任务列表'),
      }).describe('创建的任务详情'),
    })
    .create(async ({ requirement, taskName }) => {
      // 调用 DeepSeek 进行任务规划
      const prompt = `作为一个任务规划专家，请帮我分析以下需求并拆分成子任务列表。
需求：${requirement}

请按照以下 JSON 格式输出规划结果，注意：
1. priority 表示优先级，范围1-5，5为最高优先级
2. dependencies 数组表示依赖的其他子任务的索引（从0开始）
3. 确保依赖关系不会形成循环

{
  "priority": 5,
  "subTasks": [
    {
      "name": "子任务1名称",
      "priority": 4,
      "dependencies": []
    },
    {
      "name": "子任务2名称",
      "priority": 3,
      "dependencies": [0]  // 表示依赖第一个子任务
    }
  ]
}

只返回 JSON 格式的结果，不要其他任何文字。确保依赖关系合理且不会形成循环。`;

      console.log(prompt)

      let completion

      try {
        completion = await deepSeekClient.chat.completions.create({
          model: 'deepseek-v3-0324',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
        });


        console.log(completion)
      } catch (e) {
        console.log(e)
      }

      let planResult;
      try {
        // 处理可能的 Markdown 代码块
        const content = completion.choices[0].message.content;
        let jsonStr = content;

        // 如果内容是 Markdown 代码块格式，提取其中的 JSON
        const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/;
        const match = content.match(codeBlockRegex);
        if (match) {
          jsonStr = match[1].trim();
        }

        planResult = JSON.parse(jsonStr);


        // 验证依赖关系是否有效
        const validateDependencies = (subTasks) => {
          const n = subTasks.length;
          // 检查是否有无效的依赖索引
          for (let i = 0; i < n; i++) {
            const deps = subTasks[i].dependencies || [];
            if (deps.some(d => d >= i || d < 0)) {
              return false; // 发现无效的依赖
            }
          }
          return true;
        };

        if (!validateDependencies(planResult.subTasks)) {
          throw new Error('Invalid dependencies');
        }
      } catch (e) {
        console.log(e)
        // 如果解析失败或依赖关系无效，使用默认的空规划
        planResult = {
          priority: 3,
          products: [],
          subTasks: [{
            name: requirement,
            priority: 3,
            products: [],
            dependencies: []
          }],
        };
      }

      const task = {
        name: taskName,
        status: 'pending',
        priority: planResult.priority || 3,
        products: [],
        subTasks: (planResult.subTasks || []).map(subtask => ({
          name: subtask.name,
          status: 'pending',
          priority: subtask.priority || 3,
          products: [],
          dependencies: subtask.dependencies || [],
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await app.database().collection(TASK_DB).add(task);

      return {
        taskId: result.id,
        task,
      };
    });

  server
    .tool('getSubTasks')
    .description('根据任务ID查询子任务信息')
    .inputSchema({
      taskId: z.string().describe('任务ID'),
    })
    .outputSchema({
      task: z.object({
        name: z.string().describe('任务名称'),
        status: z.string().describe('任务状态'),
        subTasks: z.array(
          z.object({
            name: z.string().describe('子任务名称'),
            status: z.string().describe('子任务状态'),
            products: z.array(z.string()).describe('产物列表'),
          }),
        ).describe('子任务列表'),
      }).describe('任务详情'),
    })
    .create(async ({ taskId }) => {
      const result = await app.database().collection(TASK_DB).doc(taskId).get();
      return { task: result.data };
    });

  server
    .tool('updateTask')
    .description('更新任务和子任务的信息')
    .inputSchema({
      taskId: z.string().describe('任务ID'),
      subTaskIndex: z.number().optional().describe('子任务索引（可选，不提供则更新主任务）'),
      status: z.string().optional().describe('要更新的状态'),
      products: z.array(z.string()).optional().describe('要更新的产物列表'),
    })
    .outputSchema({
      success: z.boolean().describe('更新是否成功'),
      task: z.object({
        name: z.string(),
        status: z.string(),
        subTasks: z.array(
          z.object({
            name: z.string(),
            status: z.string(),
            products: z.array(z.string()),
          }),
        ),
      }).describe('更新后的任务信息'),
    })
    .create(async ({ taskId, subTaskIndex, status, products }) => {
      const taskRef = app.database().collection(TASK_DB).doc(taskId);
      const task = (await taskRef.get()).data;

      if (subTaskIndex !== undefined && task.subTasks[subTaskIndex]) {
        if (status) task.subTasks[subTaskIndex].status = status;
        if (products) task.subTasks[subTaskIndex].products = products;
      } else {
        if (status) task.status = status;
        if (products) task.products = products;
      }

      task.updatedAt = Date.now();
      await taskRef.update(task);

      return {
        success: true,
        task,
      };
    });

  server
    .tool('createSubTask')
    .description('为现有任务添加新的子任务')
    .inputSchema({
      taskId: z.string().describe('任务ID'),
      name: z.string().describe('子任务名称'),
      products: z.array(z.string()).optional().describe('子任务预期产物'),
    })
    .outputSchema({
      success: z.boolean().describe('创建是否成功'),
      subTaskIndex: z.number().describe('新创建的子任务索引'),
      task: z.object({
        name: z.string(),
        subTasks: z.array(
          z.object({
            name: z.string(),
            status: z.string(),
            products: z.array(z.string()),
          }),
        ),
      }).describe('更新后的任务信息'),
    })
    .create(async ({ taskId, name, products = [] }) => {
      const taskRef = app.database().collection(TASK_DB).doc(taskId);
      const task = (await taskRef.get()).data;

      const newSubTask = {
        name,
        status: 'pending',
        products,
      };

      task.subTasks.push(newSubTask);
      task.updatedAt = Date.now();

      await taskRef.update(task);

      return {
        success: true,
        subTaskIndex: task.subTasks.length - 1,
        task,
      };
    });

  server
    .tool('generateAndDeployWebpage')
    .description('根据提示词生成网页并部署到云开发静态托管')
    .inputSchema({
      prompt: z.string().describe('网页生成提示词'),
    })
    .outputSchema({
      success: z.boolean().describe('是否开始生成'),
      tempUrl: z.string().describe('临时访问URL'),
      finalUrl: z.string().describe('最终 URL'),
      message: z.string().describe('状态信息'),
    })
    .create(async ({ prompt }) => {
      // 创建任务文件夹
      const publicDir = path.join(os.homedir(), 'public');
      const taskId = crypto.randomUUID()
      const taskDir = path.join(publicDir, 'tasks', taskId);


      // 获取环境信息
      const envInfo = (await cloudbaseManager.env.getEnvInfo()) as any;
      // 获取静态网站地址
      let staticDomain = "";
      if (envInfo?.EnvInfo?.StaticStorages && envInfo.EnvInfo.StaticStorages.length > 0) {
        staticDomain = envInfo.EnvInfo.StaticStorages[0].StaticDomain;
      }

      await fs.mkdir(taskDir, { recursive: true });
      const PUBLIC_PATH = process.env.PUBLIC_PATH || ''

      // 构建访问URL和文件路径
      const tempUrl = PUBLIC_PATH + `/public/tasks/${taskId}/index.html`;
      const finalUrl = `tasks/${taskId}/index.html`;  // 云开发静态托管中的路径
      const filePath = path.join(taskDir, 'index.html')

      // 构建完整的提示词
      const fullPrompt = `
你是专业的前端开发工程师，专长于创建高保真原型设计。你的主要工作是将用户需求转化为可直接用于开发的界面原型。请通过以下方式完所有界面的原型设计，并确保这些原型界面可以直接用于开发.
1、用户体验分析：先分析这个 App 的主要功能和用户需求，确定核心交互逻辑。
2、产品界面规划：作为产品经理，定义关键界面，确保信息架构合理。
3、高保真 UI 设计：作为 UI 设计师，设计贴近真实 iOS/Android 设计规范的界面，使用现代化的 UI 元素，使其具有良好的视觉体验。
4、HTML 原型实现：使用  HTML + Tailwind CSS 生成所有原型界面，可以使用 FontAwesome 让界面更加精美、接近真实的 App 设计。拆分代码文件，保持结构清晰。
5、只生成一个 html页面
- 页面极可能向下平铺，一般不采用 tab 等交互
- 页面应当包含基础的交互动作 & 数据逻辑，而非仅是静态的内容，可以用于实际开发,页面中的内容尽可能都要支持可交互。
例如出现 tab 页面时，要支持js切换查看
- 如果需求中包含具体的链接信息，在生成的网页中也要支持跳转
- 真实感增强：
  - 界面尺寸应模拟 iPhone 15 Pro，以移动端为主。
  - 使用真实的 UI 图片，而非占位符图片（可从 Unsplash、Pexels、Apple 官方 UI 资源中选择）。

请将完整的 HTML 代码放在 <html_content>和</html_content> 标签之间，不要包含其他内容。

需求：
生成的网页要包含下面的这些信息
${prompt}
`;

      console.log('开始生成网页，任务ID:', taskId);

      // 创建一个空文件
      await fs.writeFile(filePath, '', 'utf-8');

      // 异步执行网页生成和部署
      (async () => {
        try {
          let htmlContent = '';
          let isCollectingHtml = false;
          let fileHandle = await fs.open(filePath, 'w');
          let buffer = '';
          const startTag = '<html_content>';
          const endTag = '</html_content>';

          const stream = await deepSeekClient.chat.completions.create({
            model: 'deepseek-v3-0324',
            messages: [{ role: 'user', content: fullPrompt }],
            stream: true,
            max_tokens: 8192
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              console.log(content);

              // 将新内容添加到缓冲区
              buffer += content;

              // 检查开始标签
              if (!isCollectingHtml) {
                const startIndex = buffer.indexOf(startTag);
                if (startIndex !== -1) {
                  isCollectingHtml = true;
                  buffer = buffer.substring(startIndex + startTag.length);
                  continue;
                }
              }

              // 检查结束标签
              if (isCollectingHtml) {
                const endIndex = buffer.indexOf(endTag);
                if (endIndex !== -1) {
                  // 写入结束标签之前的内容
                  const finalContent = buffer.substring(0, endIndex);
                  if (finalContent) {
                    htmlContent += finalContent;
                    await fileHandle.write(finalContent);
                  }
                  isCollectingHtml = false;
                  buffer = buffer.substring(endIndex + endTag.length);
                  continue;
                }

                // 如果缓冲区变得太大，写入一部分内容
                if (buffer.length > 1000) {
                  htmlContent += buffer;
                  await fileHandle.write(buffer);
                  buffer = '';
                }
              }
            }
          }

          // 处理最后可能剩余的内容
          if (isCollectingHtml && buffer) {
            htmlContent += buffer;
            await fileHandle.write(buffer);
          }

          await fileHandle.close();

          // 部署到云开发静态托管
          try {
            await cloudbaseManager.hosting.uploadFiles({
              files: [{
                localPath: filePath,
                cloudPath: finalUrl
              }]
            });
            console.log('文件已成功部署到云开发静态托管');
          } catch (error) {
            console.error('部署到云开发静态托管失败:', error);
          }

          console.log('网页生成完成，已保存到:', filePath);

        } catch (error) {
          console.error('生成网页失败:', error);
        }
      })();

      // 立即返回临时访问地址和最终地址
      return {
        success: true,
        tempUrl,
        finalUrl: `https://${staticDomain}/${finalUrl}`,
        message: '开始生成网页，请稍后访问提供的URL查看结果',
      };
    });

  return { server };
}

/**
 * 从上下文中提取 token
 * @param context 包含扩展上下文的注入对象
 * @returns 处理后的 API 密钥字符串
 * @throws {Error} 当 accessToken 无效时抛出错误
 */
function getApiKey(context: ContextInjected<TcbExtendedContext>) {
  const accessToken = context?.extendedContext?.accessToken || process.env.TCB_ACCESS_TOKEN
  if (typeof accessToken !== "string") {
    throw new Error("Invalid accessToken")
  }

  const apiKey = accessToken.replace("Bearer", "").trim()

  return apiKey
}


async function makeSureDbCollection(cloudbaseManager, dbName) {
  let result = await cloudbaseManager.database.checkCollectionExists(dbName)
  if (!result.Exists) {
    await cloudbaseManager.database.createCollection(dbName)
  }

}
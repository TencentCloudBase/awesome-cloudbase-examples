import { ContextInjected, TcbExtendedContext } from '@cloudbase/functions-typings';
import { CloudbaseMcpServer } from '@cloudbase/mcp/server';
import tcb from '@cloudbase/node-sdk';
import { z } from 'zod';
import { registerExampleTools } from './tools/example.js'
import { registerHunYuanTools } from './tools/hunyuan.js'

export function createServer(context: ContextInjected<TcbExtendedContext>) {
  const server = new CloudbaseMcpServer(
    {
      name: '云开发 MCP 实战第一课操作演示',
      version: '1.0.0',
    },
    { capabilities: { tools: {} } },
  );

  const env = context.extendedContext?.envId || process.env.CLOUDBASE_ENVIRONMENT; // 本地开发从环境变量读
  const secretId = context.extendedContext?.tmpSecret?.secretId;
  const secretKey = context.extendedContext?.tmpSecret?.secretKey;
  const sessionToken = context.extendedContext?.tmpSecret?.token;

  // 创建 Cloudbase Node sdk 实例
  const app = tcb.init({
    env,
    secretId,
    secretKey,
    sessionToken,
  });

  // 注册 测试的 tools
  registerExampleTools(server, app);
  // 注册混元相关 tools
  registerHunYuanTools(server, app);

  return { server };
}

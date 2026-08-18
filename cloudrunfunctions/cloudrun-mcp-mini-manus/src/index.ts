import { TcbEventFunction } from '@cloudbase/functions-typings';
import { createServer } from './server.js';
import { MCPServerRunner } from '@cloudbase/mcp/cloudrun';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface CloudFunctionEvent {
  headers?: Record<string, string>;
}

export const main: TcbEventFunction<CloudFunctionEvent> = async function (event, context) {
  // 如果是 MCP 请求，使用 MCP 服务器处理
  if (context.httpContext.url.endsWith('messages') || context.httpContext.url.endsWith('sseMessages')) {
    const runner = new MCPServerRunner(createServer, {
      verifyAccess: process.env.SKIP_VERIFY_ACCESS === 'true' ? false : true,
    });
    return runner.run(event, context);
  }

  // 处理静态文件请求
  const { httpContext } = context;
  const { url } = httpContext;
  const pathname = new URL(url).pathname;

  // 检查是否访问 /public 路径
  if (!pathname.startsWith('/public/') && pathname !== '/public') {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Not Found' })
    };
  }

  // 解析请求路径，使用用户目录下的 public 文件夹
  const publicDir = path.join(os.homedir(), 'public');
  // 移除 URL 中的 /public 前缀
  const relativePath = pathname.replace(/^\/public\/?/, '') || 'index.html';
  const filePath = path.join(publicDir, relativePath);

  // 安全检查：确保访问路径不会超出 public 目录
  if (!filePath.startsWith(publicDir)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Forbidden' })
    };
  }

  try {
    // 检查文件是否存在
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not Found' })
      };
    }

    // 读取文件内容
    const content = await fs.promises.readFile(filePath);

    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(filePath);
    let contentType = 'text/plain; charset=utf-8';
    switch (ext) {
      case '.html':
        contentType = 'text/html; charset=utf-8';
        break;
      case '.md':
        contentType = 'text/markdown; charset=utf-8';
        break;
      case '.txt':
        contentType = 'text/plain; charset=utf-8';
        break;
      case '.json':
        contentType = 'application/json; charset=utf-8';
        break;
      case '.js':
        contentType = 'application/javascript; charset=utf-8';
        break;
      case '.css':
        contentType = 'text/css; charset=utf-8';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': contentType },
      body: content.toString('utf-8'),
      isBase64Encoded: false
    };

  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not Found' })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};

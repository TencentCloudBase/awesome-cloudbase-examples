import { TcbEventFunction } from '@cloudbase/functions-typings';
import { createServer } from './server.js';
import { MCPServerRunner } from '@cloudbase/mcp/cloudrun';

export const main: TcbEventFunction<unknown> = async function (event, context) {
  const runner = new MCPServerRunner(createServer, {
    verifyAccess: process.env.SKIP_VERIFY_ACCESS === 'true' ? false : true,
  });
  return runner.run(event, context);
};

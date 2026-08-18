const { BotRunner } = require("@cloudbase/aiagent-framework");
const { N8NBot } = require("./bot");
require('dotenv').config();

/**
 * 类型完整定义请参考：https://docs.cloudbase.net/cbrf/how-to-writing-functions-code#%E5%AE%8C%E6%95%B4%E7%A4%BA%E4%BE%8B
 * "{demo: string}"" 为 event 参数的示例类型声明，请根据实际情况进行修改
 * 需要 `pnpm install` 安装依赖后类型提示才会生效
 *
 * @type {import('@cloudbase/functions-typings').TcbEventFunction<unknown>}
 */
exports.main = function (event, context) {
  return BotRunner.run(event, context, new N8NBot(context));
};

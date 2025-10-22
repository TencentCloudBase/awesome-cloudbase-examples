const { BotCore } = require("@cloudbase/aiagent-framework");

const ANSWER = "你好，我是一个智能体，但我只会说这一句话。";

/**
 * @typedef {import('@cloudbase/aiagent-framework').IBot} IBot
 *
 * @class
 * @implements {IBot}
 */
class MyBot extends BotCore {
  async sendMessage() {
    for (let i = 0; i < ANSWER.length; i++) {
      // 模拟消息发送延迟
      await sleep(50);
      // 发送消息给客户端
      this.sseSender.send({ data: { type: "text", content: ANSWER[i] } });
    }

    this.sseSender.send({ data: { type: "finish", content: "" } });

    // 流式传输结束
    this.sseSender.end();
  }
}

function sleep(timeout) {
  return new Promise((res) => setTimeout(res, timeout));
}

module.exports = {
  MyBot,
};

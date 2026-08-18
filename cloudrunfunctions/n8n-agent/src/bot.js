const { BotCore } = require("@cloudbase/aiagent-framework");
const axios = require("axios");
const crypto = require("crypto");

class N8NBot extends BotCore {
  constructor(context) {
    super(context);
    this.config = {
      n8nUrl: process.env.N8N_URL || "https://<your-endpoint>/webhook/<your-webhook>",
      n8nBearerToken: process.env.N8N_BEARER_TOKEN || "",
      inputField: "chatInput",
      responseField: "output",
      sessionIdField: "sessionId",
      emitInterval: 2000, // 2 seconds
      timeout: 60000, // 1 min
      enableStatusIndicator: true,
    };
    this.lastEmitTime = 0;
    // console.log("====", process.env, "=====")
  }

  async emitStatus(level, message, done) {
    const currentTime = Date.now();
    if (
      this.config.enableStatusIndicator &&
      (currentTime - this.lastEmitTime >= this.config.emitInterval || done)
    ) {
      console.log({
        data: {
          type: "status",
          status: done ? "complete" : "in_progress",
          level,
          description: message,
          done,
        },
      });
      this.lastEmitTime = currentTime;
    }
  }

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.config.n8nBearerToken) {
      headers["Authorization"] = `Bearer ${this.config.n8nBearerToken}`;
    }

    return headers;
  }

  async callN8n({ input, sessionId }) {
    try {
      await this.emitStatus("info", "Calling N8N Bot...", false);

      // 准备请求数据
      const payload = {
        [this.config.inputField]: input,
        [this.config.sessionIdField]: sessionId,
      };

      // 发送请求到 N8N
      const response = await axios.post(this.config.n8nUrl, payload, {
        headers: this.getHeaders(),
        timeout: this.config.timeout,
      });

      if (response.status === 200) {
        const n8nResponse = response.data[this.config.responseField];

        // 发送响应给客户端
        this.sseSender.send({
          data: {
            content: n8nResponse,
            reasoning_content: "",
          },
        });
      } else {
        throw new Error(`N8N error: Status ${response.status}`);
      }
    } catch (error) {
      const errorMsg = `Error during N8N execution: ${error.message}`;
      console.error(errorMsg);
      await this.emitStatus("error", errorMsg, true);

      this.sseSender.send({
        data: {
          content: errorMsg,
          reasoning_content: "",
        },
      });
    } finally {
      this.sseSender.end();
      await this.emitStatus("info", "Complete", true);
    }
  }

  async sendMessage({ msg }) {
    await this.callN8n({
      input: msg,
      sessionId: this.context.userId || crypto.randomUUID(),
    });
  }

  async getRecommendQuestions({ msg }) {
    await this.callN8n({
      input: `
        用户的问题是：
        ${msg}
        
        你会推荐我问你什么问题？举三个例子。
      `,
    });
  }
}

module.exports = {
  N8NBot,
};

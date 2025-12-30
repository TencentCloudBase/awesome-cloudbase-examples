# 查询天气 Agent ———— 基于混元大模型

本模板提供了自定义 Agent 的云函数实现，通过调用大模型封装 Agent 接口，部署后提供以下 Agent 相关接口：

```shell
POST   /v1/aibot/bots/:botId/send-message        发送消息
GET    /v1/aibot/bots/:botId/records             获取聊天记录
POST   /v1/aibot/bots/:botId/feedback            提交用户反馈
GET    /v1/aibot/bots/:botId/feedback            获取用户反馈
GET    /v1/aibot/bots/:botId/recommend-questions 获取推荐问题
```

本模板使用了 `@cloudbase/aiagent-framework`，只需要实现该库定义的 Agent 接口即可完成接入，详见 `src/bot.ts`。

## 部署须知

在部署至云函数前，请运行以下命令：

```shell
npm run preDeploy
```

## 本地调试指引

本模板使用 typescript 开发，运行 `npm run build` 编译 javascript 产物到 `dist/` 文件夹中。

启动本地调试前，需要修改 `package.json` 中的 `dev` 命令，将 `your-env-id` 替换为您的云开发环境 id。

运行 `npm run dev` 启动本地调试。

现在即可通过 `127.0.0.1:3000` 访问本地 Agent 服务了。

### cURL 访问本地服务

直接访问 `127.0.0.1:3000` 即可，例如 `POST   /v1/aibot/bots/:botId/send-message        发送消息` 接口：

```shell
curl 'http://127.0.0.1:3000/v1/aibot/bots/ibot-myBot-botTag/send-message' \
  -H 'Accept: text/event-stream' \
  -H 'Content-Type: application/json' \
  --data-raw '{"msg":"hi"}'
```

### Web 访问本地服务

使用 Web 页面访问本地服务，可以直接编写网络请求代码，也可以使用 [@cloudbase/js-sdk 提供的 Agent SDK](https://docs.cloudbase.net/ai/agent/sdk)。

若使用 @cloudbase/js-sdk，则需要配置一定的代理服务。以 [whistle](https://wproxy.org/whistle/) 举例，按照如下配置：

```shell
/.*.api.tcloudbasegateway.com/([^S]*)/ http://localhost:3000/$1
```

即可使用 @cloudbase/js-sdk 用以下代码访问到本地服务：

```js
const res = await ai.bot.sendMessage({
  botId: 'ibot-myBot-botTag',
  msg: 'hi',
  history: []
})

for await (let x of res.textStream) {
  console.log(x);
}
```

### 直接调试 typescript 代码

若不想将 typescript 编译到 javascript 代码再进行调试，则可以将 `cloudbase-functions.json` 中的 `functionsRoot` 字段值改为 `./src`，再运行 `npm run dev`，即可直接调试 typescript 代码。

## 参考文档

- [云函数2.0](https://docs.cloudbase.net/cbrf/intro)
- [云开发 AI+](https://docs.cloudbase.net/ai/introduce)

# 空白函数型智能体模板

本模板提供了空白函数型智能体的实现，封装了一个最简的 Agent 接口，部署后提供以下 Agent 相关接口：

```shell
POST    /v1/aibot/bots/:botId/send-message       发送消息
```

本模板使用了 `@cloudbase/aiagent-framework`，只需要实现该库定义的 [IBot 接口](https://docs.cloudbase.net/ai/cbrf-agent/IBot) 即可完成接入，详见 `src/bot.js`。

## 部署须知

在部署至云函数前，请删除本目录的 node_modules。

## 本地调试指引

安装依赖：

```shell
npm i
```

启动本地调试：

```shell
npm run dev
```

现在即可通过 <http://127.0.0.1:3000> 访问本地 Agent 服务了。

### cURL 访问本地服务

直接访问 <http://127.0.0.1:3000> 即可，例如 `POST /v1/aibot/bots/:botId/send-message 发送消息` 接口：

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

## 参考文档

- [函数型智能体](https://docs.cloudbase.net/ai/cbrf-agent/intro)
- [函数型云托管](https://docs.cloudbase.net/cbrf/intro)
- [云开发 AI+](https://docs.cloudbase.net/ai/introduce)

# 元器智能体模板

本模板提供了元器智能体的实现，部署后提供以下 云开发Agent 相关接口：

```shell
POST   /v1/aibot/bots/:botId/send-message        发送消息
GET    /v1/aibot/bots/:botId/recommend-questions 获取推荐问题
```

本模板使用了 `@cloudbase/aiagent-framework`，只需要实现该库定义的 [IBot 接口](https://docs.cloudbase.net/ai/cbrf-agent/IBot) 即可完成接入，详见 `src/index.ts`。

调用链路:

![调用链路](https://qcloudimg.tencent-cloud.cn/raw/75c895ececd994f9b171f751960893e4.png)

## 获取元器 APPID 和 APP KEY

前往 [腾讯元器 平台](https://yuanqi.tencent.com/v2#/agent-shop/home)，选择想要接入的元器智能体，点击 应用发布 -> 服务状态 获取 APPID 和 APP KEY。

![获取元器信息](https://qcloudimg.tencent-cloud.cn/raw/c0cb2b6b5949b081431e0840c6d007e4.png)


## 环境变量

本仓库提供了环境变量模板 `.env.template`，可将其重命名为 `.env.development` 后再进行编辑。

- 需要将**元器的智能体 ID** 配置到 `YUAN_QI_AGENT_ID` 环境变量
- 需要将**元器的 apiKey** 配置到 `YUAN_QI_API_KEY` 环境变量

## 本地调试指引

首先，请编辑 `.env.development` 文件配置好环境变量：

1. YUAN_QI_AGENT_ID: 填入元器的智能体 ID
2. YUAN_QI_AGENT_ID: 填入元器平台上的 apiKey
3. TENCENTCLOUD_SECRETID: 填入腾讯云访问密钥 SecretId
4. TENCENTCLOUD_SECRETKEY: 填入腾讯云访问密钥 SecretKey
5. EXTENDED_CONTEXT: 将 envId 更换为云开发环境 id

[点击前往获取腾讯云访问密钥](https://console.cloud.tencent.com/cam/capi)

配置完环境变量后，安装依赖：

```shell
npm i
```

即可启动本地调试：

```shell
npm run dev
```

现在可以通过 <http://127.0.0.1:3000> 访问本地 Agent 服务了。

### cURL 访问本地服务

直接访问 <http://127.0.0.1:3000> 即可，例如 `POST v1/aibot/bots/:botId/send-message 发送消息` 接口：

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
  botId: "ibot-myBot-botTag",
  msg: "hi",
  history: [],
});

for await (let x of res.textStream) {
  console.log(x);
}
```

## 部署

安装依赖：

```shell
npm i
```

构建代码：

```shell
npm run build
```

部署到函数型云托管：

```shell
npm run deploy
```

根据输出提示填入云开发环境 id、服务名即可。

可前往 [云开发平台 | 云托管](https://tcb.cloud.tencent.com/dev#/platform-run/service/detail) 查看对应服务的部署情况。

## 参考文档

- [函数型智能体](https://docs.cloudbase.net/ai/cbrf-agent/intro)
- [函数型云托管](https://docs.cloudbase.net/cbrf/intro)
- [云开发 AI+](https://docs.cloudbase.net/ai/introduce)

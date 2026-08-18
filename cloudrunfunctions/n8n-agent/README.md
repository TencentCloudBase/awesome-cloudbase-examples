# 告别繁琐的 API 胶水代码！我用云托管 + n8n 搭建了一个强大的 AI 工作流引擎

在构建现代应用，尤其是 AI 应用时，我们开发者常常需要扮演“胶水工程师”的角色：从 A 服务的 API 获取数据，根据数据调用 B 模型的接口，再将结果处理后发送给 C 服务... 这个过程充满了琐碎、重复的逻辑代码，不仅开发效率低，而且后期维护和迭代也异常痛苦。

有没有一种更优雅的方式？

答案是肯定的。**n8n**，这个强大的开源工作流自动化工具，就是为此而生。它让我们可以通过拖拽节点的方式，可视化地编排复杂的业务逻辑，将 API、数据库、AI 模型像乐高积木一样轻松组合起来。

但是，`n8n` 部署在哪里最合适呢？自建服务器运维麻烦，官方云版本又可能在功能和成本上有所限制。

今天，我们将介绍一种近乎完美的方案：**使用腾讯云云开发云托管（Cloud Base Run）来部署 n8n**。既能使用 n8n 的完整功能，又享受弹性扩容、按需付费和免运维的优势。

## 成果展示：我们将构建一个什么样的“个人助理”？

在开始动手之前，先来看看我们最终要实现的成果。我们将构建一个智能路由 Agent，它能像一个聪明的调度员，接收用户的日常提问，如果是简单问题，直接使用一个轻量级的 LLM 快速回答节约成本减少等待时间，如果比较复杂，可以使用一个更强大的 LLM 并且调用云开发搜索工具来获取相关资料，从而提供更准确、更专业的回答。
这个智能助理的核心，就是下面这个在 n8n 中设计的 Workflow：

![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-workflow-v2.png)

它的工作流程如下：

1.  **Webhook 节点**：作为入口，接收来自云开发 AI Bot 或其他应用的 HTTP 请求。
2.  **Router 节点**：进行智能判断。如果是简单的日常对话，就交给一个轻量级的 LLM 快速回答。如果是一个需要专业知识的复杂问题（例如：“帮我搜索一下云托管最近有什么更新”），就交给 Primary AI Agent 节点处理。
3.  **Primary AI Agent 节点**：调用我们预先部署好的**云开发搜索工具（MCP）**，检索相关资料, 将检索到的资料和原始问题一起，由更强大的 LLM 进行总结、润色和回答。
4.  **Secondary LLM 节点**：快速回答简单问题，可以选择成本低速度快的模型。
5.  **Webhook 响应**：最后，将处理好的答案通过 Webhook 返回给提问者。

整个过程清晰、可控，并且可以随时通过增删节点来扩展它的能力。

## 为什么是“云托管 + n8n”？—— 架构解析

这个方案的强大之处，在于云托管与 n8n 的完美结合，以及对云开发生态的无缝利用。让我们通过一张架构图来理解它的工作原理：

![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-architecture.png)

这个架构的核心优势体现在：

- **极致的部署体验**: n8n 官方提供了 Docker 镜像。我们只需在云托管控制台填入镜像地址，即可一键部署，彻底告别服务器采购、环境配置和网络设置的烦恼。
- **无与伦比的成本效益**: 云托管的“按需付费”与“缩容到 0”能力，与 n8n 的 Webhook 触发模式是天作之合。没有工作流执行时，服务可以自动缩容到 0，不产生任何计算费用。这对于个人项目、初创团队和有明显波峰波谷流量的应用来说，是巨大的成本节约。
- **强大的生态联动**: n8n 部署在云托管上，可以作为中枢，轻松、低延迟地调用同在云开发生态下的**云函数**、**数据库**和 **MCP 工具集**，真正形成了 1+1>2 的效果。

## 实战演练：四步构建你的 AI 个人助理

理论讲完，让我们开始实战吧！

### 第 1 步：在云托管上部署 n8n 服务

首先，我们需要一个运行 n8n 的环境。

1.  登录 [云开发控制台](https://tcb.cloud.tencent.com/dev)，进入**云托管**页面。
2.  在创建服务中选择“通过容器镜像部署”，并填入 n8n 官方镜像：`n8nio/n8n` ，端口配置为 `5678`。
3.  点击创建，稍等片刻，云托管就会为你启动一个 n8n 服务，并提供一个默认的访问域名。

> **重要提示：关于数据持久化 (生产环境必读)**
>
> - **本文演示的部署方式**：为了快速体验，我们直接使用了 n8n 镜像的默认配置。它会将您的工作流、凭证和执行记录保存在一个内置的 SQLite 文件中。这种方式非常适合快速测试和功能验证，但**不适用于生产环境**，因为任何重启都会导致数据丢失。
> - **生产环境推荐配置**：为了确保数据安全和持久化，您**必须**为 n8n 配置一个外部数据库。n8n 官方推荐使用 **PostgreSQL**。您可以通过在云托管服务中配置以下环境变量，将 n8n 连接到外部数据库（例如 [腾讯云数据库 PostgreSQL](https://cloud.tencent.com/product/postgres)）：

### 第 2 步：为 n8n 准备“工具箱”

我们的 AI 助理需要一些强大的工具来完成任务。

- **工具一：部署 MCP 搜索工具**

  1.  在云开发控制台，进入 `AI+ -> MCP -> 创建 MCP server`。
  2.  选择 `云开发 AI 能力` 模板，鉴权方式选择 `云开发 API key 授权`，开始部署。

      ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/deploy-mcp-1.png)

  3.  部署完成后，进入详情页，复制 **MCP server URL**，并在 `配置 MCP` 标签页中根据指引获取 **API key**。这两个值我们稍后会用到。

      ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/deploy-mcp-3.png)

- **工具二：创建函数型智能体**
  我们的 n8n workflow 是通过一个“函数型智能体”来接收和响应请求的。这个智能体的作用就是调用 n8n 的 Webhook。
  1.  将模板仓库中的代码克隆到本地：[n8n-agent](https://github.com/TencentCloudBase/awesome-cloudbase-examples/tree/master/cloudrunfunctions/n8n-agent)
  2.  复制 `.env.example` 文件为 `.env`，我们将在下一步获取 Webhook 信息后填充它。

### 第 3 步：设计并配置 n8n Workflow

现在，让我们打开 n8n 的画布，开始像搭乐高一样构建我们的工作流。

1.  访问你刚刚部署好的 n8n 服务域名，完成初始化设置。
2.  下载模板中的 Workflow 配置文件 [Agent_for_cloudbase.json](https://github.com/TencentCloudBase/awesome-cloudbase-examples/blob/master/cloudrunfunctions/n8n-agent/Agent_for_cloudbase.json)。
3.  在 n8n 界面中，选择 `Import from File`，将该文件导入，即可看到我们预设好的工作流。

    ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-import-workflow.png)

4.  **配置 Webhook 节点**:

    - 点击 `Webhook` 节点，在右侧配置面板中复制 `Test` URL 下的 Webhook URL。这就是你的 `<your-webhook-url>`。 注意： 这里复制的 URL 域名部分是 localhost 或者 127.0.0.1 的，需要替换为你之前部署的 n8n 服务域名。
    - 为了安全，还可以配置 `Authentication` 为 `Header Auth`，新建一个 Credential，设置 `Name` 为 `Authorization`，`Value` 为 `Bearer <your-token>`（`<your-token>`替换为你自己的安全令牌）。
      ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-webhook-auth.png)

5.  **配置模型节点**:

    - 点击名为 `Primary AI Agent` 的节点，选择你喜欢的 LLM（本例为 DeepSeek）。
    - 新建 Credential，填入你从 [DeepSeek 官网](https://api-docs.deepseek.com/) 获取的 API Key。

      ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-model-config.png)

6.  **配置 MCP 节点**:

    - 点击 `Call MCP Search Tool` 节点。
    - `SSE endpoint` 填入第 2 步获取的 **MCP server URL**。
    - 鉴权方式选择 `Bearer token`，Credential 填入第 2 步获取的 **MCP server API key**。

      ![](https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/n8n-agent/images/n8n-mcp-config.png)

7.  **激活 Workflow**: 点击右上角的 `Active` 开关，让工作流生效。

### 第 4 步：部署并测试我们的智能体

1.  进入第 2 步下载的函数型智能体代码目录，打开 `.env` 文件，将上一步获取的 `<your-webhook-url>` 和 `<your-token>` 填入。
2.  部署函数型智能体，推荐使用 [CloudBase CLI](https://github.com/TencentCloudBase/cloudbase-cli) 进行部署

```shell
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登陆
npm run login

# 部署，根据提示输入你的云开发环境 ID 和服务名
npm run deploy
```

> 注意：服务名需要符合 `ibot-<bot-name>` 的格式。

3. 创建云开发 AI Bot

   - 进入 [云开发控制台](https://tcb.cloud.tencent.com/dev)，点击左侧菜单栏的 `AI+ -> Agent -> 创建 -> 函数型 Agent`。
   - 选择 `空白 Agent`，在标识中填入上一步的 `<bot-name>` 和 `<bot-tag>`，点击 `创建`。

创建成功后，我们就可以通过对话来触发 n8n 工作流了。测试完成以后，可以参考接入指引，将智能体接入到小程序或者 Web 应用。

## 总结

通过本文，我们不仅学会了如何集成 n8n 和云开发 AI Bot，更重要的是，我们掌握了一种全新的应用构建模式：**以云托管为核心，部署像 n8n 这样的中枢应用，用它来编排和调度云函数、AI 模型、数据库等周边能力，从而构建出强大而灵活的解决方案。**

今天的例子只是抛砖引玉。你还可以让 n8n：

- 连接到你的企业微信，监控 Github 提交，自动生成团队周报。
- 连接到你的电商数据库，当有新订单时自动调用 AI 生成感谢邮件。
- 定时抓取行业资讯，通过 AI 总结后推送到你的个人微信。

## 关于腾讯云云开发云托管

对于还不熟悉云托管的开发者，这里做一个简要介绍。

**云托管（CloudBase Run）** 是腾讯云云开发推出的容器化应用托管服务，它让开发者可以无需关心服务器运维，专注于业务逻辑开发。

### 核心特性

- **零运维**：无需购买服务器，无需配置网络和负载均衡，一键部署即可获得生产级服务
- **弹性伸缩**：根据实际访问量自动扩缩容，支持缩容到 0 实例，真正做到按需付费
- **不限语言**：开发者可使用任意自己喜爱的语言和框架，包括 Node.js、Python、Java、Go 等

### 成本优势

相比传统的云服务器部署方式，云托管的成本优势明显：
- **按需计费**：只为实际使用的计算资源付费，空闲时间零成本
- **免运维成本**：无需专人负责服务器维护、安全更新等
- **快速迭代**：支持灰度发布、版本回滚，降低发布风险

### 适用场景

- **Web 应用**：前后端分离的应用、API 服务、管理后台等
- **工具服务**：如本文的 n8n 等开源工具的托管
- **微服务架构**：将单体应用拆分为多个独立的微服务

这就是为什么在本文中，我们选择云托管来部署 n8n 的原因——它不仅简化了部署流程，更在成本控制和运维效率上带来了巨大的提升。

---

**下一步**

- 本文所有代码和 workflow 配置文件已开源在 [awesome-cloudbase-examples](https://github.com/TencentCloudBase/awesome-cloudbase-examples)，欢迎下载使用
- 立即访问[云开发云托管](https://tcb.cloud.tencent.com/dev)，让你零成本上手体验！
- 搜索云开发公众号联系小助手，或者在云开发控制台联系客服加入我们的开发者交流群，与更多开发者一起探索 AI 应用的无限可能！

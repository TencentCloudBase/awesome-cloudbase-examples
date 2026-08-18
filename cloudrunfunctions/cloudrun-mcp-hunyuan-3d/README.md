# 混元 3D MCP 示例

本模板提供了 MCP Server 的基础实现。可部署至云托管。推荐以此模板为基础项目进行修改，开发 MCP Server。

部署后，将会在 `/messages` 提供服务。

## 本地开发调试

### 安装依赖

```shell
npm i
```

### 登录命令行

`@cloudbase/cli` 需要登录后才能使用，使用云开发账号登录:

```shell
npm run login
```

### 环境变量

将 `.env.template` 更名为 `.env.development` ，该文件定义了环境变量：

- `MCP_SSE_ROUTE=LOCAL`：设置后可启用本地 SSE 服务，将 MCP Inspector/MCP Host（如 Cursor）连接至本地 MCP Server
- `SKIP_VERIFY_ACCESS=true`：设置后可跳过 token 校验。原有 token 校验将只允许来自 API Key 和超管身份的 token 调用
- `CLOUDBASE_ENVIRONMENT=your-env-id`：在云托管线上环境中，上下文里包含了云开发环境 id。在本地开发时，我们通过设置该环境变量来提供环境 id。请设置一个当前登录账号下的环境 id

:::tip
设置 `MCP_SSE_ROUTE`、`SKIP_VERIFY_ACCESS` 这两个环境变量有助于我们在本地进行调试，但不建议在线上生产环境设置。
:::

### 启动本地 MCP Server 服务

```shell
npm run dev
```

启动后，将会在 <http://localhost:3000/messages> 提供服务。

修改代码，即可触发重新编译并重启服务。

### 启动图形界面调试

运行 MCP Inspector:

```shell
npx @cloudbase/mcp-inspector
```

前往 <http://localhost:5173/> 进行调试。

1. 在左侧选择 `POST` 或 `SSE` 类型，并填入 `URL` 为 `http://localhost:3000/messages`
2. 在左侧点击 `Connect`
3. 在 `Tools` tab 下点击 `List Tools` 展示工具列表
4. 选择任一工具进行调用

## 部署至云托管

### 构建

```shell
npm run build
```

### 部署

该 MCP Server 能够直接部署至云托管，但要在云开发 Agent 中使用，需要在控制台先创建一个 MCP Server，再覆盖其云托管服务。

首先，前往[云开发平台](https://tcb.cloud.tencent.com/dev#/ai?tab=mcp)创建一个 MCP Server。

创建完成后，运行 cli 部署命令，填入对应的 MCP 服务标识。

```shell
npm run deploy
```

# cloudbase-stripe

Stripe 支付集成示例。面向国际业务：Checkout Session 收款 + Webhook 回调。回调**一律由云函数用 `stripe-signature` 自验签**（`stripe-pay` 集成实测不做网关代验签），没有任何「跳过验签」的模式开关。

## 目录结构

```
cloudbase-stripe/
├── cloudbaserc.json         集成级声明：云函数 + 前端 app（pay-stripe-demo）
├── functions/pay-stripe/    云函数（Express + Stripe SDK）
│   ├── config/              凭证读取与启动校验
│   ├── routes/              /stripe/create_session | retrieve_session | create_refund | webhook
│   ├── controllers/         鉴权中间件 + 回调处理 + 统一应答
│   ├── services/            策略入口 + 事件分发 + 幂等
│   ├── .env.example         环境变量模板（复制为 .env）
│   └── Dockerfile           云托管部署
└── examples/web/            Checkout 前端示例（单文件，零依赖）
```

## 快速开始

```bash
# 1. 装依赖 + 跑单测（151 个用例，不需要网络与真实密钥）
cd functions/pay-stripe
npm install && npm test

# 2. 填凭证（测试模式密钥即可，Stripe Dashboard → Developers → API keys）
#    回调由本函数自验签，所以必须有 whsec
export stripeSecretKey=sk_test_xxx
export stripeWebhookSecret=whsec_xxx     # 用 stripe listen 打印的那个
export PORT=3000

# 3. 本地起服务 + 转发 webhook（另开终端）
node ./bin/www
stripe listen --forward-to localhost:3000/notify

# 4. 跑前端示例
cd ../../examples/web && npx serve .
```

## 部署

只有一份配置：本目录 `cloudbaserc.json`（云函数 + 前端 app 都在里面）：

| 目标 | 命令 |
|---|---|
| 只部署云函数 | `tcb fn deploy pay-stripe --httpFn --force` |
| 云函数 + 前端 app | `tcb deploy --only functions` 或 `tcb app deploy pay-stripe-demo` |

> `functions/pay-stripe/` 下曾有一份单函数 `cloudbaserc.json`，环境变量与集成段跟这里完全重复，
> 改一处容易漏另一处，已删除。所有部署命令都在本目录执行。

云托管部署则用 `functions/pay-stripe/Dockerfile`。

## 调用方式与鉴权（重要）

同一个函数有三种入口，**鉴权责任完全不同**，接错入口会直接 401：

| 入口 | 地址形态 | 谁做鉴权 | 你必须做什么 |
|---|---|---|---|
| 云 API | `https://<envId>.api.tcloudbasegateway.com/v1/functions/pay-stripe` | **网关**验 `Authorization: Bearer <accessToken>` | 前端先登录拿 accessToken；body 里带 `_action` |
| HTTP 访问服务（自定义域名） | `https://<你的域名>/stripe/*` | **看路由配置** | 必须给这条路由**开启身份认证**，否则业务接口一律 401 |
| 集成中心回调域名 | `https://<实例>.integration-callback.tcloudbase.com/notify` | 无（只验证 Stripe 签名） | 只给 Stripe 后台填，**不要**当业务入口 |

### 云 API 入口

- 业务动作放在 body 的 `_action`：`create_session` / `retrieve_session`
- **不要把 `/stripe/xxx` 拼到地址后面**：这个入口只认根路径，拼了会 400
- token 无效 / 过期时网关直接返回 `401 INVALID_CREDENTIALS`，请求不会进函数
- 请求示例见 [函数 README「下单示例」](./functions/pay-stripe/README.md#下单示例)

### HTTP 访问服务入口

路由是 path 级别的，一条路由一个 path。**关键：必须在路由上开启身份认证。**

```bash
tcb routes list -e <envId>   # 「身份认证」这一列必须是「开启」
```

不开身份认证时网关不注入身份 → 函数收到 `x-authmethod: UNAUTHORIZED`、`x-userid` 为空 → 一律 401。

> 集成中心绑定回调的那条域名是**关闭**身份认证的（否则 Stripe 回调进不来），
> 所以它天然不能承载业务接口。业务必须另走云 API 或另建一条开启认证的路由。

身份判定的实现细节见 [函数 README「鉴权」](./functions/pay-stripe/README.md#鉴权)。

## 部署前端示例

根目录 `cloudbaserc.json` 的 `app` 段声明了 `examples/web`，纯静态、跳过 install 与 build：

```json
"app": {
  "serviceName": "pay-stripe-demo",
  "root": "./examples/web",
  "framework": "static",
  "installCommand": "",
  "buildCommand": "",
  "outputDir": "."
}
```

```bash
# 云端构建并部署前端 app（static 跳过 install/build，直接上传）
tcb app deploy pay-stripe-demo -e <envId>
```

部署完成后控制台会输出访问地址，用输出的那个域名打开（`webapps.tcloudbase.com` 或
`tcloudbaseapp.com/<路径>`，以命令输出为准）。

页面里两件事必须填对：

- **API Base** 填云 API 地址：`https://<envId>.api.tcloudbasegateway.com/v1/functions/pay-stripe`
  （页面识别到 `/v1/functions/` 会自动改用 `_action`，不再拼 `/stripe/xxx` 路径）
- **accessToken** 填登录后拿到的 token（页面会把 `Bearer` 前缀补上）

> 🚨 接口地址**只从同源 localStorage 恢复**（下单时记住），不再接受 `?apiBase=`。
> 否则别人发一条 `?apiBase=https://evil.example&envId=xxx` 的链接，页面会在静默登录后
> 把 accessToken 发到那个域名。回跳地址因此只带 `session_id`。
> 需要自动登录时用 `?envId=<环境ID>` 进入一次，之后 envId 也会被记住。

记得把云函数的 `corsAllowOrigin` 配成这个站点的 origin，否则浏览器调用会被 CORS 拦掉。

> `examples/web` 没有 `package.json`，所以 `framework: static` 与两个空命令是必需的；
> 少了它们云端会执行 `npm install` 并失败。

## 环境变量

完整清单与必填说明见 [`functions/pay-stripe/README.md`「环境变量」](./functions/pay-stripe/README.md#环境变量)，
模板文件为 [`functions/pay-stripe/.env.example`](./functions/pay-stripe/.env.example)。

最少需要两个：`stripeSecretKey` 与 `stripeWebhookSecret`（回调由函数自验签，缺一不可）。

## 范围

一期：Checkout Session 下单、查单、退款、单 Webhook 回调、验签、幂等。
二期：订阅、Elements 嵌入式收银台。

## 已知待办

- `stripe-pay` 集成的网关代验签能力待平台确认；当前只能由函数自验签，
  实测细节见 [`functions/pay-stripe/README.md`「回调验签」](./functions/pay-stripe/README.md#回调验签一律由云函数自验签)。
- 业务侧需把 `TODO(业务侧)` 处对接自己的订单表（当前只有内存 Map）。

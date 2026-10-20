# 环境变量与凭证

## 凭证清单

| 变量（集成中心注入名） | 必填 | 出处 | 用途 |
|---|---|---|---|
| `offerId` | ✅ | 虚拟支付 → 基本配置 | 虚拟支付商户号（米大师应用 ID） |
| `appKey` | ✅ | 虚拟支付 → 基本配置 | 签名密钥，计算 `paySig`（旧名 `prodAppKey`） |
| `appId` | ✅ | MP 后台 → 设置 | 换取 sessionKey / access_token |
| `secret` | ✅ | MP 后台 → 设置 | **换取 sessionKey 必需**（旧名 `appSecret`） |
| `notifyFormat` | 否 | — | `json`（默认）/ `xml`，**须与微信后台登记一致**；唯一需要写进 `cloudbaserc.json` 的变量 |
| `notifyUrlCallbackType` | 否 | 空（未声明 = 自己验签） | `system` = 网关代验签；`ownservice` = 本函数验签 |

**变量名以集成中心注入为准**：`authTypeCode=wxvirtualpay` 注入的是 `appId / secret / offerId / appKey`。本地 `.env` 与旧版文档用的 `prodAppKey` / `appSecret`，由 `config/config.js` 的 `readEnv()` 回退兼容 —— 优先平台名，两套都能跑。

> 🚨 踩过的坑：代码只读 `appSecret`、平台注入 `secret` → 值为空 → `jscode2session` 返回 **41004 appsecret missing**。部署后先看启动日志有没有配置校验告警。

## 🚨 信任模型（务必理解后再上线）

模板默认**信任上游网关**——认为 HTTP 云函数平台网关 / 集成中心网关已完成鉴权。

这是必要假设，不是偷懒：

| 看似可用的判断依据 | 为什么不能用 |
|---|---|
| `process.env.SCF_RUNTIME` | 在 SCF 运行时**恒存在**，无法说明「本次请求过了网关」 |
| `process.env.TENCENTCLOUD_RUNENV` | 同上（云托管） |
| `x-tcb-integration-id` 等自定义 header | **客户端可任意伪造**，绝不能作为鉴权凭据 |

因此只有一档可信身份：

| 身份来源 | 信任级 | 说明 |
|---|---|---|
| `x-wx-openid` | **前提成立时可信** | 平台网关注入并覆盖客户端同名头；**云函数被公网直连时客户端可自行伪造** |
| Bearer JWT payload | **不采信** | 仅 base64 编码、未验签，任何人都能伪造 —— 模板不再解析 |
| 其他自定义 header | **不可信** | 不参与鉴权判断 |

模板不在函数内做鉴权（原 `requireCallerAuth` 三档开关已移除）：
默认宽松放行的中间件对公网直连场景不产生任何保护，只会让人误以为有鉴权。
**若云函数会被直接暴露到公网，请在上游（API 网关 / 云托管）完成身份校验。**

## 凭证归属说明

| 归属 | 凭证 | 落点 |
|---|---|---|
| 虚拟支付侧 | OfferID、AppKey | 登记到集成，由平台注入云函数环境变量 |
| 小程序侧 | AppID、AppSecret | 由业务方提供，同样注入环境变量（业务代码不接触明文） |
| 消息推送 | Token、EncodingAESKey（注入名 `token` / `msgSecret`） | `notifyUrlCallbackType=system` → 网关用，业务不读；`ownservice` → **业务函数自己验签解密，必填** |

**AppSecret 为什么必须在服务端**：`signature` 是用户态签名，密钥是 `sessionKey`，而 `sessionKey` 只能用 AppSecret 通过 `auth.code2Session` 换取。云函数的 `getWXContext()` 只给 `OPENID / APPID / UNIONID / ENV`，**不提供 sessionKey**。

## 🚨 安全红线

1. **AppSecret 只放服务端环境变量**——禁止写进客户端代码、禁止提交仓库、禁止打印到日志
2. **AppKey 不要用于生产以外的用途**
3. 云函数重新部署时环境变量会被平台覆盖回原样，改配置会触发重新部署（约 1–2 分钟）

## 🚨 环境变量归谁管

| 部署方式 | 环境变量来源 | `cloudbaserc.json` 要不要声明 `envVariables` |
|---|---|---|
| CLI 部署（`tcb fn deploy`） | `functions[].envVariables`，值由 CLI 按 `.env` 解析 `{{env.X}}` | 要声明，且**键名与 `.env` 逐字一致** |
| 集成中心创建 | 平台按表单自动注入到它生成的函数 | `integrations[].envVariables` 声明字段名，值同样从 `.env` 解析 |
| 云托管 | 控制台「服务设置 → 环境变量」 | 不适用 |

**踩过的坑**：占位符 `{{env.APP_ID}}` 在 `.env` 里找不到 `APP_ID`（因为 `.env` 写的是 `appId`）时，CLI **不报错**，而是写入**空值**，把云函数环境变量覆盖成空。表现为「部署成功，运行时才报 41004 / 41002 / 缺少 secret」，且**每次重新部署都会把之前配好的值也清掉**。

规则只有一条：**`{{env.foo}}` ↔ `.env` 里的 `foo=`，逐字相同。**

部署前自检：

```bash
bash skill/cloudbase-xpay/scripts/check_env_keys.sh
```

脚本会列出「占位符在 .env 里找不到对应键」以及「.env 里没被引用的键（多半是名字写错了）」，只输出变量名与长度，不打印值。

## 本地开发配置

```bash
cp .env.example .env    # .env 已被 .gitignore 忽略，不会提交
```

`bin/www` 通过 dotenv 加载 `.env`（必须早于 `require('../app')`，因为 `config.js` 在模块加载时就读 `process.env`）。
线上由平台注入环境变量，找不到 `.env` 时静默跳过，不影响运行。

提交前复核：

```bash
git check-ignore -v functions/xpay-common/.env
# → integration/cloudbase-xpay/.gitignore:2:.env  functions/xpay-common/.env
```

## 启动时自检

`config/config.js` 的 `validateConfig()` 会在服务启动时校验，**只告警不阻断**：

```
[Config] 环境变量(名=长度): offerId=10 appKey=32 prodAppKey=- appId=18 appid=- APP_ID=- secret=32 appSecret=- notifyFormat=6 token=4 msgSecret=43 sandboxAppKey=32
[Config] 现网(env=0) | notifyFormat=json
⚠️ 配置校验警告（共 4 项）:
  1. offerId 未配置（虚拟支付 → 基本配置）
  2. appId 未配置（平台注入名 appId；下单时也可由请求头 x-wx-appid 提供）
  3. secret 未配置（平台注入名 secret / 本地名 appSecret，换取 sessionKey 必需）
  4. appKey 未配置（平台注入名 appKey / 本地名 prodAppKey）
```

> 设计成「不阻断」是为了支持**先部署、后补凭证**。真正的失败会发生在下单调用时，并给出明确中文错误。

## 环境：仅现网

模板**不提供沙箱切换**：`config/config.js` 的 `env` 是硬编码常量 `0`，`signData.env` / B 端 `env` 固定传 `0`（协议必填字段，不可省略）。

原因：沙箱仅适用开发版/体验版，**真机预览会被 `PAYMENT_ILLEGAL_IN_SANDBOX` 拦截**，实际联调一律走现网。保留沙箱等于多一个「配错就签名失败」的开关。

> iOS 真机需在 MP 后台开通 IAP（配置小程序简称 + 开通虚拟支付 iOS 能力）。

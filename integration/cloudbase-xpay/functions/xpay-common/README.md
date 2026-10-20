# xpay-common

小程序虚拟支付云函数模板。面向**虚拟商品**（道具直购、代币支付、会员订阅），解决 iOS 端支付合规——底层把微信支付与 Apple IAP 打通，同一套 `wx.requestVirtualPayment` 在两端都能拉起收银台。

## 与「微信支付」模板（pay-common）的差异

| 维度 | 普通支付 pay-common | 虚拟支付 xpay-common |
|---|---|---|
| 商品 | 实物 | 虚拟商品 |
| 客户端 API | `wx.requestPayment` | `wx.requestVirtualPayment` |
| 下单动作 | 后端调 V3 接口拿 `prepay_id` | **后端本地构造 signData + 双签名，客户端自行拉起** |
| 服务端接口 | `/v3/pay/transactions/*` | `/xpay/*`（米大师 Midas） |
| 回调通道 | 微信支付回调 + AES-GCM | **小程序消息推送** + AES-256-CBC（网关解密） |
| 凭证 | 商户号 5 项 + PEM 证书 | OfferID + AppKey + AppID/AppSecret |
| 费率 / 结算 | 约 0.6%，T+1 | 安卓 1% T+3；iOS 12% 约 45-60 天 |

**结论**：业务层几乎不共用，本模板只复用了 pay-common 的 Express 骨架、鉴权中间件、云 API 适配层与部署配置。

## 目录结构

```
xpay-common/
├── bin/www                  启动入口
├── app.js                   Express 装配（JSON + XML 双格式）
├── index.js                 云函数入口
├── config/config.js         凭证 + 现网常量（env=0）
├── routes/xpay.js           路由表
├── controllers/xpayController.js   鉴权 + 回调应答
├── services/
│   ├── xpayService.js       下单 + 6 类事件分发 + 幂等
│   ├── signService.js       ★ 双签名（paySig + signature）
│   └── strategies/xpayStrategy.js  /xpay/* B 端接口
├── utils/
│   ├── wechatApi.js         code2Session / access_token
│   ├── xml.js               XML 推送解析
│   └── cloudbaseAuth.js     x-wx-openid / JWT
└── tests/
```

## 环境变量

| 变量（集成中心注入名） | 必填 | 说明 | 本地/旧名 |
|---|---|---|---|
| `offerId` | 是 | 虚拟支付商户号（虚拟支付 → 基本配置） | — |
| `appKey` | 是 | 支付签名密钥，计算 `paySig` | `prodAppKey` |
| `appId` | 是 | 小程序 AppID | — |
| `secret` | 是 | 换取 sessionKey 必需，**只放服务端** | `appSecret` |
| `notifyFormat` | 否 | `json`（默认）/ `xml`，**必须与微信后台登记一致** | — |
| `corsAllowOrigin` | 否 | 跨域白名单 | — |
| `requireCallerAuth` | 否 | 设为 `true` 收紧鉴权：只放行平台注入身份（云函数公网暴露时必开） | — |
| `trustUnverifiedJwt` | 否 | 设为 `true` 才采信未验签的 JWT payload（默认不采信） | — |

**命名对齐**：集成中心（`authTypeCode=wxvirtualpay`）注入的是 `appKey` / `secret`，而本地 `.env` 与旧版文档写的是 `prodAppKey` / `appSecret`。`config/config.js` 的 `readEnv()` 优先读平台名、回退旧名，两套都能跑。

> 实测踩过的坑：代码只读 `appSecret` 而平台注入 `secret` → 值为空 → `jscode2session` 返回 **41004 appsecret missing**。部署后建议先看启动日志有没有 `⚠️ 配置校验警告`。

**AppID 有两条来源**：`/xpay/create_order` 与 `/xpay/query_order` 优先用平台注入的请求头 `x-wx-appid`（`wx.cloud.callHTTPFunction` 会自动带上），环境变量 `appId` 只作回退 —— 所以只走小程序调用时，`appId` 不配也能跑。

**排查利器**：启动时会打两行环境变量清单（只打长度不打值）：

```
[Config] 环境变量(名=长度): offerId=10 appKey=32 prodAppKey=- appId=18 appid=- secret=32 appSecret=- ...
[Config] 其他环境变量(名=长度): XPAY_CONFIG=64 ...
```

- 某个候选名显示 `-` → 平台没注入这个名字
- 第二行列出平台**实际**注入的全部变量名 —— 如果这里出现了你没见过的名字，代码读的名字就要改
- 下单报错信息里也会带上同一份摘要（含「其他变量」），排查不用翻冷启动日志

> 🚨 **所有候选变量全为空**（`offerId=- appId=- secret=- appKey=- token=- ...`）时，基本不是变量名问题，而是**你调用的函数不是集成中心托管的那一个**。集成中心托管的 HTTP 云函数名为 `<集成名>-<随机串>`，小程序 `app.js` 的 `functionName` 必须填这个名字，不能填裸的 `xpay-common`。

集成中心还会注入 `token` / `msgSecret`（消息推送 Token 与 EncodingAESKey）。

**这两种变量怎么用，取决于回调走哪条路：**

| 部署方式 | Token / EncodingAESKey 谁用 | 业务代码 |
|---|---|---|
| 集成中心托管（网关代验签、代解密） | 网关 | 不读取、不实现密码学 |
| 直连 HTTP 访问服务（集成中心未上线 / 自测） | **本函数** | 必须自实现，见下节「自建回调」 |

## 自建回调（无网关时）

**URL 填在哪个入口**：MP 后台 →【虚拟支付 → 基本配置 → 基础配置 → **发货推送配置**】。

> 不是「开发管理 → 消息推送」。虚拟支付发货推送复用了消息推送的验签/解密能力，但配置项挂在虚拟支付下；两处的 Token / EncodingAESKey 指向同一套值。

`app.js` 已内置三段逻辑，配好 `token` / `msgSecret` / `appId` 即可用：

1. **URL 校验**：`GET <任意路径>?signature=&timestamp=&nonce=&echostr=`，验签通过原样返回 `echostr`，否则 401。用 `app.get('*')` 是因为 HTTP 访问服务会给 URL 加路径前缀（如 `/xpay-demo`）。
2. **来源认证**：`POST` 带 `signature` 时必验。**明文推送也验** —— 验签与加密是两件事，只验 `msg_signature` 会让不加密的推送直接越过验签，任何人都能伪造 `xpay_goods_deliver_notify` 触发发货。
3. **安全模式解密**：body 含 `Encrypt` 时，用 `msg_signature`（签名串含 `Encrypt`）验签，再 AES-256-CBC 解密，把明文转成对象交给路由。密文外壳（`{"Encrypt":"..."}` / `<Encrypt>`）与解密后的明文形态（JSON / XML）都认。

> ⚠️ **解密后必须按明文形态解析**：后台「数据格式」选 JSON 时，解密结果就是 **JSON 字符串**。如果一律用 XML 解析器，会得到空对象 → 取不到 `Event` → 推送打到根路径 `/` 时无路由可匹配 → **404**。日志现象是「密文已解密」紧接着 404，很有迷惑性。`utils/xml.js` 的 `parsePayload()` 负责按形态选择，解密日志会带上 `Event=` 便于确认。

「谁负责验签」优先看**平台声明的三个字段**，读不到才退回 `token` 启发式：

| 变量 | 取值 | 含义 |
|---|---|---|
| `notifyUrlCallbackType` | `system` | 系统内置回调地址，网关代验签/代解密 |
| | `ownservice` | 用户自定义回调地址，本函数自己验签解密 |
| `notifyUrlResourceType` | `function` / `cloudrun` | 回调打到云函数 / 云托管 |
| `msgEncryptType` | `plaintext` | 明文：只有 `signature`，无 `Encrypt` |
| | `aes` | 安全模式：`Encrypt` + `msg_signature` |
| | `compatible` | 兼容模式：**明文与密文同时下发**，解密失败可回退明文 |

判定优先级：`ownservice` → 本函数验签；`system` → 网关代验签；都未注入 → 看 `token` 是否配置。

启动日志会打两行，直接看结论：

```
[Callback] 声明: type=ownservice resource=function encrypt=aes | token=已配 msgSecret=43 位
[Callback] 判定: 本函数验签 + 可解密
```

自检会主动告警这些错配：

| 错配 | 后果 | 提示 |
|---|---|---|
| `msgEncryptType=aes/compatible` 但 `msgSecret` 非 43 位 | 解密必失败 | 补 `msgSecret` |
| `type=system` 却配了 `token` | 网关若改写 `signature` → 误判 401 | 删 `token` |
| `type=ownservice` 却没配 `token` | 推送无法验签 | 补 `token` |
| `notifyUrlResourceType=cloudrun` | 回调打到云托管，此函数收不到推送 | 检查部署形态 |

`compatible` 的额外行为：解密失败但 body 里有明文 `Event` 时，**回退用明文字段继续处理**而不是返回 400——兼容模式本来就把明文和密文一起发了，没必要让微信白重推 15 次。

`appId` 用于解密后校验明文尾部的 AppID，不一致会抛错。

切到集成中心托管后，`notifyUrlCallbackType` 会变成 `system`，无需改代码；老集成没有这三个字段时，删掉 `token` 即可平滑退化。

> 微信推送的 `Content-Type` 不固定（`text/xml` / `application/xml`，偶发不带），`app.js` 用 `express.text({ type: (req) => !req.is('application/json') })` 兜住，保证密文以字符串进入解密中间件；`application/json` 的密文由 `extractEncrypt` 直接从对象里取。

> **仅现网**：模板不提供沙箱切换，`signData.env` / B 端 `env` 字段固定传 `0`。
> 官方口径：`env` **同时决定用哪把 AppKey**（0→现网 key，1→沙箱 key），且 **Apple 支付不支持沙箱、只支持现网**；沙箱本身又仅限开发版/体验版、真机预览会被 `PAYMENT_ILLEGAL_IN_SANDBOX` 拦截。对以 iOS 为目标的场景，沙箱没有任何可用路径。

## 路由

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /xpay/create_order` | 是 | 返回 `payData` 给 `wx.requestVirtualPayment` |
| `POST /xpay/query_order` | 是 | 查单，推送丢失时兜底补发货 |
| `POST /xpay/callback` | 否（网关代验签；自建回调时由 `app.js` 自验签解密） | 所有 `xpay_*` 事件统一入口 |

## 前端调用示例

```js
wx.login({
    success: ({ code }) => {
        wx.cloud.callHTTPFunction({
            name: 'xpay-common',
            config: { env: ENV_ID },
            path: '/xpay/create_order',
            method: 'POST',
            data: { code, productId: 'product_001', goodsPrice: 100, buyQuantity: 1 },
            success: (res) => {
                const { signData, mode, paySig, signature } = JSON.parse(res.data).data;
                wx.requestVirtualPayment({
                    signData, mode, paySig, signature,
                    success: () => console.log('支付成功'),
                    fail: (err) => console.error('支付失败', err),
                });
            },
        });
    },
});
```

## ⚠️ 关键坑

1. **signData 必须按原样字符串签名**。任何 `JSON.parse` → `stringify` 重排键顺序都会让签名失效。`signService.js` 所有签名入口只接收字符串，就是为了从接口上杜绝这个坑。
2. **应答格式必须与推送格式一致**（`notifyFormat`）。格式不对或非 0 → 微信重推最多 15 次，指数退避。
3. **iOS 退款问询必须 3 秒内应答**，且 `evidence` 必填。3 次都超时 → 结果标记为「不确定」，决定权交给 Apple。
4. **发货以推送为主、查单兜底**。前端 `success` 回调不可靠（用户异常退出即丢），不能作为发货依据。
5. **幂等键是平台单号 `wx_order_id`**（推送里的 `WeChatPayInfo.MchOrderNo`），缺失时回退商家单号 `OutTradeNo`。
   官方口径以平台单号为准：用户取消后重新下单可能复用同一个 `OutTradeNo`，用商家单号去重会误判成「重复」→ 漏发货。
   示例用内存 Set，生产请换数据库唯一索引。
   **顺序必须是「查重 → 处理 → 落标记」**：先落标记再处理，一旦处理失败，重推会被当重复事件忽略 → 永久丢单。
6. **回调错误要分级应答**：结构性错误（缺 `Event`）回 `ErrCode=0` 避免无效重推；业务异常回非 0 触发微信重推。全回 0 = 静默丢单。
7. **鉴权默认信任上游网关**。`SCF_RUNTIME` 等运行时变量恒存在、自定义 header 可伪造，都不能作为鉴权依据。云函数若直接暴露公网，务必设 `requireCallerAuth=true`。
8. **命名风格两套**：C 端 signData 用驼峰（`offerId`），服务端接口用下划线（`order_id` / `offer_id`）。写错直接报参数错误。
9. **iOS 走 Apple 支付，最低金额 1 元**（100 分）—— 低于 1 元的道具档位在 iPhone 上必然失败；开发者无法主动退款，只能应答 Apple 的退款问询（3 秒内 + `evidence` 必填）；结算周期 45–60 天，与安卓 T+3 完全不同。
10. **`query_order` 只能查现金单**，查不了代币单（代币单靠 `query_user_balance` / 幂等重试兜底）。

## 回调事件

| Event | 处理 |
|---|---|
| `xpay_goods_deliver_notify` | **核心**：幂等发货 |
| `xpay_coin_pay_notify` | 更新代币余额 |
| `xpay_refund_notify` | 更新订单 + 回收道具 |
| `xpay_complaint_notify` | 记录，人工跟进 |
| `xpay_wxpay_callback_notify` | 记录风控，按需申诉 |
| `xpay_subscribe_ios_refund_query_notify` | 3 秒内应答退款决策 |

## 集成边界（改造时绕开）

- **云函数随机串不可改** —— 与回调域名子域、内置环境变量绑定，改名即断回调
- **回调路由由平台预置**，不要改路径
- **删除集成 ≠ 删除云函数** —— 删除集成会释放回调域名（不可恢复）

## 本地开发

```bash
npm install

# 配置环境变量（.env 已被 gitignore，不会提交）
cp .env.example .env
# 编辑 .env，填入 offerId / appKey / appId / secret

# 部署前自检：占位符 ↔ .env 键名是否对得上（见下方说明）
bash ../../skill/cloudbase-xpay/scripts/check_env_keys.sh

npm test      # 36 个单元测试（含官方签名基准向量）
npm start     # 默认 3000 端口，自动加载 .env
```

### 环境变量从哪来

| 场景 | 来源 |
|---|---|
| 本地开发 | `.env`（`bin/www` 通过 dotenv 加载） |
| SCF 云函数 | 平台环境变量（集成中心注入）；无 `.env` 时 dotenv 静默跳过 |
| 云托管 | 控制台「服务设置 → 环境变量」 |

> 🚨 **`cloudbaserc.json` 的 `{{env.X}}` 与 `.env` 的键名必须逐字一致 —— 连大小写不同都算不一致。**
>
> CLI 部署时按 `.env` 解析占位符。名字对不上**不会报错**，而是写入**空值**，把云函数的环境变量覆盖成空。现象极具欺骗性：部署成功，运行时才炸：
>
> ```
> 41004 appsecret missing  →  secret 是空的
> 41002 appid missing      →  appId 是空的
> 缺少 secret              →  部署把已有的值也覆盖没了
> ```
>
> 实测踩过：`.env` 里叫 `appId`，占位符写的是 `{{env.APP_ID}}` → 全部解析为空。
>
> **部署前自检**（只读，不打印值）：
>
> ```bash
> bash ../../skill/cloudbase-xpay/scripts/check_env_keys.sh
> ```
>
> 它会列出「占位符在 .env 里找不到对应键」和「.env 里没被引用的键（多半是名字写错了）」。

> ⚠️ `.env` 含密钥，已由 `integration/cloudbase-xpay/.gitignore` 忽略。**不要 `git add -f`**。
> 提交前可用 `git check-ignore -v functions/xpay-common/.env` 复核。

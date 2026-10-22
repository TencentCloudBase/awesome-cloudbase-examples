# 小程序虚拟支付（cloudbase-virtualpay）

面向**虚拟商品**（道具直购、代币支付、会员订阅）的微信小程序支付集成示例。

封装米大师（Midas）侧的**服务端**能力：`paySig` / `signature` 双签名、下单、发货推送、
查单兜底、退款与 iOS 退款问询；客户端统一用 `wx.requestVirtualPayment`。

> iOS 端能否拉起收银台，取决于小程序后台是否开通「虚拟支付 iOS 能力」且微信 ≥ 8.0.68 ——
> 属平台侧前置条件，服务端替代不了，模板只处理签名与推送。详见
> [`examples/miniprogram/README.md`](examples/miniprogram/README.md)。
>
> 实物商品走微信支付请用 [`../cloudbase-wx-pay`](../cloudbase-wx-pay)。

---

## 目录结构

```
cloudbase-virtualpay/
├── functions/xpay-common/     云函数模板（Express + HTTP 云函数 / 云托管）
├── examples/miniprogram/      可直接导入微信开发者工具的最小 Demo
└── skill/cloudbase-xpay/      AI Agent Skill（14 篇参考文档 + 2 个自检脚本）
```

| 入口 | 用途 |
|---|---|
| [`functions/xpay-common/README.md`](functions/xpay-common/README.md) | 云函数目录结构、环境变量、部署方式 |
| [`examples/miniprogram/README.md`](examples/miniprogram/README.md) | 前端 Demo 运行说明 |
| [`skill/cloudbase-xpay/SKILL.md`](skill/cloudbase-xpay/SKILL.md) | Agent 技能入口（踩坑清单 + 文档索引） |
| [`skill/cloudbase-xpay/references/template-onboarding/quick-start.md`](skill/cloudbase-xpay/references/template-onboarding/quick-start.md) | 自建部署完整步骤 |
| [`skill/cloudbase-xpay/references/template-onboarding/integration-center.md`](skill/cloudbase-xpay/references/template-onboarding/integration-center.md) | 走集成中心（网关代验签） |

---

## 5 分钟跑通

### 1. 拿齐凭证

**凭证（集成中心会自动注入；本地自测自己填）**：

| 凭证 | 出处 | 用途 |
|---|---|---|
| `offerId` | MP 后台 → 虚拟支付 → 基本配置 | 虚拟支付商户号（米大师应用 ID） |
| `appKey` | 同上 | 支付签名密钥，算 `paySig`，只放服务端 |
| `secret` | MP 后台 → 设置 → 基本设置 | AppSecret，换 sessionKey 必需，只放服务端 |
| `appId` | 同上 | 换 sessionKey / access_token；**只走小程序调用时可不配**（平台注入的请求头 `x-wx-appid` 优先） |
| `token` / `msgSecret` | MP 后台 → 开发管理 → 消息推送 | 自建回调必填：验签 Token + EncodingAESKey（43 位）；集成中心托管时由网关使用 |

> `notifyUrlCallbackType` / `msgEncryptType` 由平台注入；本地自测需手填，且 `msgEncryptType`
> 必须与后台「消息推送 → 加密方式」一致，否则实际收到的形态与声明不符（表现为验签失败 / 解密失败）。
> `sandboxAppKey` 本模板不读（`env` 固定 0 现网），留空即可。

**完整环境变量表**见 [`functions/xpay-common/README.md#环境变量`](functions/xpay-common/README.md#环境变量)：共 13 项 —— 平台注入 9 个、平台系统字段 1 个（`notifyUrlResourceType`，不进函数环境变量）、模板自有 1 个（`XPAY_GUARD`）、部署侧 `TCB_ENV_ID`、本地 `PORT`，含必填性与本地/旧名对照（`prodAppKey` / `appSecret`）。

两条要点：

- **应答格式不需要配置**：跟随请求 `content-type`（XML 回 XML，其余回 JSON），无该头时看请求体是否 `<xml` 开头
- **联调只看一个变量**：`XPAY_GUARD`，不设即 `on`；本地 `npm run dev` 自动设 `off`，云上带 `off` 会**拒绝启动**

> 道具需先创建并**发布**，同步要几分钟到半小时，期间下单报
> `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY`。

### 2. 本地自检

```bash
cd functions/xpay-common
npm install
npm test                          # 单元测试

cp .env.example .env              # 按 xpay-common/README.md#环境变量 填写；只走集成中心可只填 TCB_ENV_ID
bash ../../skill/cloudbase-xpay/scripts/check_env_keys.sh
```

`check_env_keys.sh` 校验 `cloudbaserc.json` 的 `{{env.X}}` 占位符与 `.env` 键名逐字一致 ——
名字对不上时 CLI 不报错，而是**静默写成空值**，现象是「部署成功但运行时才炸」
（`41004 appsecret missing` / `41002 appid missing`）。

### 3. 部署

```bash
# 在 functions/xpay-common 目录内执行（cloudbaserc.json 在这一层）
# 从仓库根部署则用：tcb fn deploy xpay-common --dir integration/cloudbase-virtualpay/functions/xpay-common
tcb fn deploy xpay-common -e <你的环境ID>
```

HTTP 云函数与云托管都支持（云托管见 `functions/xpay-common/Dockerfile` + `scf_bootstrap`）。

> ⚠️ `functions[].envVariables` 是**整体覆盖**：走集成中心时若 `.env` 里凭证留空就单独部署，
> 会把平台注入的值写成空串（`41004 appsecret missing`）。重跑一次集成创建/更新即可覆盖回来，
> 或者直接把 `.env` 填全再部署。

### 4. 前端

打开 `examples/miniprogram/`，改 `app.js` 里的 `envId` / `functionName` 后导入开发者工具。

```js
const { code } = await wx.login();                     // ① 拿 code
const res = await callXpay('create_order', { code, productId, goodsPrice, buyQuantity });
await wx.requestVirtualPayment({                       // ② 拉起收银台
  signData: res.data.signData,
  mode: res.data.mode,
  paySig: res.data.paySig,
  signature: res.data.signature,
});
```

### 5. 验回调

支付成功后平台推送 `xpay_goods_deliver_notify`。日志应出现解密记录，应答为
`{"ErrCode":0,"ErrMsg":"success"}`。

```bash
tcb fn log xpay-common -e <环境ID>
```

---

## 对外接口

> 下表是**函数内路径**。完整 URL = HTTP 访问服务地址（含路径前缀）+ `/xpay/xxx`；
> 用 `wx.cloud.callHTTPFunction` 调用时只传函数名与参数，前缀由平台拼接。

| 路由 | 身份来源 | 说明 |
|---|---|---|
| `POST /xpay/create_order` | 平台注入 `x-wx-openid` + `code2Session` 换出的权威 openid 必须一致 | 出 `signData` + 双签名，**不下单** |
| `POST /xpay/query_order` | 同上 + 订单归属校验（`XPAY_GUARD=on` 时查不到单即拒绝） | 查单兜底（前端 success 回调不可靠） |
| `POST /xpay/callback` | `notifyUrlCallbackType=system` → 网关验签；`ownservice`/未声明 → 本函数自验签（fail closed） | 消息推送落点，按 `Event` 分发 |

完整清单见 [`references/api-routes.md`](skill/cloudbase-xpay/references/api-routes.md)。

---

## 三条最容易踩的坑

1. **服务端不参与下单** —— 与普通微信支付完全相反。服务端只出签名，客户端 `wx.requestVirtualPayment` 自行完成下单。
2. **签名用原样字符串** —— 任何 `JSON.parse` → `stringify` 重排键顺序都会让签名失效。
3. **幂等键用平台单号 `wx_order_id`** —— 用 `OutTradeNo` 去重会在「取消后重新下单复用同一单号」时漏发货。

其余见 [`SKILL.md` 的 Gotchas 踩坑清单](skill/cloudbase-xpay/SKILL.md)。

---

## 交付边界

这是**模板**，不是可直接上线的成品。以下三处需要按业务实现（代码内已标 `TODO(业务侧)`）：

| 位置 | 现状 | 生产必须替换 |
|---|---|---|
| `services/xpayService.js` 幂等 | 内存 `Set`（5000 条上限） | 数据库唯一索引，云函数冷启动会丢内存状态 |
| `services/xpayService.js` 发货 | 只更新内存订单状态 | 对接自己的订单表与道具 / 代币余额 |
| `services/xpayService.js` iOS 退款问询 | 查不到单 → 拦截（`result_code=1`）；查得到 → 按 `REFUND_BLOCKING_STATES`（含 `GOODS_MISSING`）判定 | 内存 Map 冷启动即空 = 等价「永不放行」，生产必须查持久化订单表 + 真实风控规则 |

另外：模板**只走现网**（`env` 固定 0），不提供沙箱切换。

---

## 相关技能

| 技能 | 范围 |
|---|---|
| `cloudbase-wechatpay` | 实物商品的普通微信支付（`pay-common` 模板） |

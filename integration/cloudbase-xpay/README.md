# 小程序虚拟支付（cloudbase-xpay）

面向**虚拟商品**（道具直购、代币支付、会员订阅）的微信小程序支付集成示例。

核心价值是**解决 iOS 端支付合规**：底层把微信支付与 Apple IAP 打通，同一套
`wx.requestVirtualPayment` 在安卓与 iOS 都能拉起收银台。

> 实物商品走微信支付请用 [`../cloudbase-wx-pay`](../cloudbase-wx-pay)；海外收款用 Stripe。

---

## 目录结构

```
cloudbase-xpay/
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

### 1. 拿齐 4 个凭证

| 凭证 | 出处 |
|---|---|
| `offerId` | MP 后台 → 虚拟支付 → 基本配置 |
| `appKey` | 同上（支付签名密钥，只放服务端） |
| `appId` | MP 后台 → 设置 → 基本设置 |
| `secret` | 同上（AppSecret，换取 sessionKey 必需） |

> 道具需先创建并**发布**，同步要几分钟到半小时，期间下单报
> `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY`。

### 2. 本地自检

```bash
cd functions/xpay-common
npm install
npm test                          # 70 个单元测试

cp .env.example .env              # 填入 4 个凭证 + TCB_ENV_ID
bash ../../skill/cloudbase-xpay/scripts/check_env_keys.sh
```

`check_env_keys.sh` 校验 `cloudbaserc.json` 的 `{{env.X}}` 占位符与 `.env` 键名逐字一致 ——
名字对不上时 CLI 不报错，而是**静默写成空值**，现象是「部署成功但运行时才炸」。

### 3. 部署

```bash
tcb fn deploy xpay-common -e <你的环境ID>
```

HTTP 云函数与云托管都支持（云托管见 `functions/xpay-common/Dockerfile` + `scf_bootstrap`）。

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

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /xpay/create_order` | ✅ | 出 `signData` + 双签名，**不下单** |
| `POST /xpay/query_order` | ✅ | 查单兜底（前端 success 回调不可靠） |
| `POST /xpay/callback` | 网关验签 | 消息推送落点，按 `Event` 分发 |

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
| `services/xpayService.js` iOS 退款问询 | 未发货即放过 | 查持久化订单表 + 真实风控规则，否则已发货订单有资损风险 |

另外：模板**只走现网**（`env` 固定 0），不提供沙箱切换。

---

## 相关技能

| 技能 | 范围 |
|---|---|
| `cloudbase-wechatpay` | 实物商品的普通微信支付（`pay-common` 模板） |
| `miniprogram-virtualpay-person` | 微信官方虚拟支付开通、道具管理、结算规则 |

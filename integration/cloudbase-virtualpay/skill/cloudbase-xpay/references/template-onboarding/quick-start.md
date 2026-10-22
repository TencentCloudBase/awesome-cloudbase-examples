# 快速开始（无集成中心，自建部署）

## 前置条件

| 项 | 要求 |
|---|---|
| 主体 | 企业 / 个体户 / 个人均可（个人需类目含「工具」） |
| 小程序 | 已认证、已备案 |
| 云开发 | 已开通并拿到环境 ID |
| 虚拟支付 | MP 后台已开通，拿到 OfferID + AppKey |
| 道具 | 已在「虚拟支付 → 道具管理」创建并**发布** |

## 步骤

### 1. 开通虚拟支付并获取凭证

MP 后台 → 虚拟支付 → 基本配置：

| 凭证 | 用途 |
|---|---|
| **OfferID** | 虚拟支付商户号（米大师分配） |
| **AppKey** | 支付签名密钥（模板仅支持现网，无沙箱切换） |

另需：AppID（MP 后台 → 设置）、**AppSecret**（换取 sessionKey 必需）。

### 2. 创建道具

虚拟支付 → 道具管理 → 创建，记录 **道具 ID 与价格（分）** → 发布。

> ⚠️ 发布后需等待**几分钟到半小时**全平台同步，期间下单会报 `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY`。

### 3. 部署云函数

```bash
cd integration/cloudbase-virtualpay/functions/xpay-common
npm install
npm test        # 单元测试（签名基准向量 / 回调 / XML / 配置映射）
```

> ⚠️ 部署实测注意（2026-10）：
> 1. `npm test` 统一用**无参数**的 `node --test`（脚本里已是这个写法）：
>    目录参数（`tests/` 或 `tests`）在 Node 22+ 会把目录当模块路径直接 `MODULE_NOT_FOUND`；
>    而 glob（`tests/*.test.js`）在 Node 18/20 不被展开、在 Windows cmd 下也不展开。
>    无参数形式在 18 / 20 / 22 / 24 上实测均可（自带 `node_modules` 排除）。
> 2. HTTP 云函数 runtime 用 `Nodejs24.11`；`Nodejs18.15` 已被创建链路拒绝
>    （SCF 报 `Unsupported runtime`）。
> 3. 扩展连库等场景新增自定义环境变量时：`TCB_*` 前缀与 `NODE_ENV` 是**平台保留变量**，
>    写入函数配置报 `Reserved environment variables cannot be modified`，请自定义前缀。
>    且 HTTP(Web) 函数运行时**不会**自动注入 CloudBase 凭证（Event 函数才有），
>    需显式配置环境 API Key / 密钥；`@cloudbase/node-sdk` v3 的 `init()` 为
>    **平铺参数** `{ secretId, secretKey, sessionToken }`，嵌套 `credentials` 会被忽略。

在云函数环境变量中配置（**不要写进代码**）：

```bash
offerId=你的OfferID
appKey=你的AppKey
appId=你的小程序AppID
secret=你的AppSecret
```

然后部署（HTTP 云函数 / 云托管均可）。

### 4. 前端调用

见 `references/frontend-integration/miniprogram.md`，或直接参考 `examples/miniprogram/`。

核心三段：

```js
const { code } = await wx.login();                    // ① 拿 code
const res = await callXpay('create_order', { code, productId, goodsPrice, buyQuantity });
await wx.requestVirtualPayment({                       // ② 拉起收银台
  signData: res.data.signData,
  mode: res.data.mode,
  paySig: res.data.paySig,
  signature: res.data.signature,
});
```

### 5. 验证回调

支付成功后平台会推送 `xpay_goods_deliver_notify` 到回调路由。检查云函数日志确认收到，且应答为 `{"ErrCode":0,"ErrMsg":"success"}`。

## 最小验证清单

- [ ] `npm test` 全绿
- [ ] 环境变量齐备（启动时 `validateConfig()` 不再告警）
- [ ] 真机拉起收银台成功
- [ ] 支付后云函数日志出现 `xpay_goods_deliver_notify`
- [ ] 订单状态变为已发货
- [ ] 前端「查询订单」能查到结果

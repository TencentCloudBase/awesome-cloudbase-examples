# 个人小程序虚拟支付 Demo

一个可跑通的**个人主体小程序虚拟支付（道具直购）**示例：

> 选商品 → 服务端下单签名 → `wx.requestVirtualPayment` 拉起支付 → 平台推送发货 → 幂等发货 → 查单兜底

基于**微信云开发**（云函数 + 云数据库），不依赖自建服务器。

---

## ⚠️ 先读这一段

本仓库为**脱敏版**，密钥已被替换为占位符，**直接运行会失败**。使用前请先填好 3 个值：

| 占位符 | 需填入 | 获取位置 |
| --- | --- | --- |
| `YOUR_APP_SECRET` | 小程序 AppSecret | MP 后台 → 开发管理 → 开发设置 |
| `YOUR_PROD_APP_KEY` | 虚拟支付现网 AppKey | MP 后台 → 虚拟支付 → 基本配置 |
| `YOUR_SANDBOX_APP_KEY` | 虚拟支付沙箱 AppKey | MP 后台 → 虚拟支付 → 沙箱配置 |

需同步修改以下 **4 个文件**（共 12 处）：

```text
config/keys.js                          # 仅本地留存，不参与运行
cloudfunctions/createOrder/config.js    # 云函数运行时真正读取
cloudfunctions/queryOrder/config.js
cloudfunctions/refundOrder/config.js
```

> `config/keys.js` 只是集中记录用的，**改它不会生效**。云函数独立部署，各自读自己目录下的 `config.js`。

`appid` 和 `offerId` 已在脱敏时保留，可直接使用；换小程序时需一并替换。

---

## 前置条件

| 条件 | 说明 |
| --- | --- |
| 小程序主体 | **个人**，持有居民身份证 |
| 服务类目 | 含 **「工具」** |
| 认证与备案 | 已完成小程序认证、备案 |
| 虚拟支付 | 已开通并完成签约 |
| 月限额 | 个人主体**全终端 10 万元/月** |
| 开发工具 | 微信开发者工具（最新稳定版） |
| 基础库 | ≥ 2.2.3（云能力）；iOS 支付需微信客户端 ≥ 8.0.68 |

---

## 快速开始

```text
① 开通虚拟支付       → 建道具、拿 AppID / OfferID / AppKey
② 填 4 个配置文件     → 替换 3 个占位符 + 填 envId
③ 打开项目部署云函数   → 5 个云函数全部「上传并部署（云端安装依赖）」
④ 订阅消息推送        → payNotify 接收虚拟支付事件
⑤ 真机测试            → 走完一笔支付，看数据库状态变化
```

---

## 项目结构

```text
virtualpay-demo/
├── project.config.json           # appid、miniprogramRoot、cloudfunctionRoot
├── miniprogram/                  # 小程序前端
│   ├── app.js / app.json / app.wxss / sitemap.json
│   ├── config.js                 # 前端配置：envId、商品列表
│   ├── utils/pay.js              # 下单 + 拉起支付 + 查单封装
│   ├── custom-tab-bar/           # 自定义 tabBar
│   └── pages/
│       ├── index/                # 商品列表 + 购买
│       └── my/                   # 我的订单 + 已购道具 + 退款
└── cloudfunctions/               # 云函数（共 5 个）
    ├── createOrder/              # 下单：code2Session → 双签名 → 订单入库
    ├── payNotify/                # 虚拟支付回调：发货 / 退款处理
    ├── queryOrder/               # 查单兜底 + 订单/道具列表
    ├── refundOrder/              # 发起退款
    └── getUserInfo/              # 返回当前用户 openid
```

---

## 支付闭环

```text
用户点购买
    ↓
createOrder 下单：生成 outTradeNo + signData + paySig + signature，订单入库（pending）
    ↓
wx.requestVirtualPayment 拉起支付
    ↓
支付成功 → 平台推送 xpay_goods_deliver_notify 到 payNotify → 幂等发货（delivered）
    ↓
推送丢失时 → queryOrder 调 /xpay/query_order 查单 → 已支付则补发货
```

两条链路互为兜底：**推送为主，查单为辅**。前端 `success` 回调**不能**作为发货依据。

---

## 配置说明

### 1. 开通虚拟支付

1. [微信公众平台](https://mp.weixin.qq.com) → 支付与交易 → 虚拟支付 → 开通（个人主体 + 工具类目 + 认证备案）
2. 审核通过后扫码签约
3. 记录三个参数：**AppID**（设置）、**OfferID**、**现网 AppKey**（虚拟支付 → 基本配置）
4. 在**道具管理**创建道具，记下道具 ID 和价格，**完成发布**

示例道具：

| productId | 名称 | 价格（分） |
| --- | --- | --- |
| `goods_001` | 高级会员月卡 | 100 |
| `goods_002` | 加速卡10张 | 200 |
| `goods_003` | 尊贵标识永久 | 300 |

> ⚠️ 道具必须**已发布**，否则无论沙箱还是现网都会被拒单。

### 2. 前端配置

`miniprogram/config.js`：

```js
module.exports = {
  envId: '<你的云开发环境 ID>',   // 云开发控制台 → 设置 → 环境 ID
  goods: [
    { productId: 'goods_001', name: '高级会员月卡', price: 100, desc: '...' }
    // productId、price 必须与 MP 后台【道具管理】完全一致
  ]
}
```

### 3. 云函数配置

| 文件 | 需要填写的参数 |
| --- | --- |
| `cloudfunctions/createOrder/config.js` | appid、appSecret、offerId、prodAppKey、sandboxAppKey、商品列表 |
| `cloudfunctions/queryOrder/config.js` | appid、appSecret、offerId、prodAppKey、sandboxAppKey |
| `cloudfunctions/refundOrder/config.js` | appid、appSecret、offerId、prodAppKey、sandboxAppKey |
| `cloudfunctions/payNotify/config.js` | 无需配置 |

> 正式上线建议改用**云函数环境变量**存储密钥，避免密钥随代码包分发。

### 4. 数据库集合

在云开发控制台创建两个集合，权限建议「仅创建者可读写」：

| 集合 | 用途 |
| --- | --- |
| `virtualpay_orders` | 订单表 |
| `virtualpay_user_goods` | 用户已购道具表 |

> `createOrder` 已内置「集合不存在自动创建」兜底，可跳过手动创建。云函数使用 `wx-server-sdk`，属管理员权限，不受安全规则限制。

---

## 部署

### 1. 打开项目

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "<项目绝对路径>"
```

或直接在微信开发者工具中「导入项目」，选择 `virtualpay-demo` 目录。

### 2. 部署云函数

在开发者工具中右键 `cloudfunctions` 下的**每个**函数 → **上传并部署（云端安装依赖）**。

共 5 个：`createOrder`、`payNotify`、`queryOrder`、`refundOrder`、`getUserInfo`。

CLI 方式（逐个执行，注意带 `--remote-npm-install`）：

```bash
wechatide -c CodeBuddy cloud_fn_deploy --appid <appid> --env <envId> \
  --path <云函数目录绝对路径> --remote-npm-install
```

### 3. 订阅虚拟支付回调

云开发控制台 → 设置 → 其他设置 → 消息推送 → 添加配置：

| 项 | 值 |
| --- | --- |
| 推送模式 | 云函数 |
| 消息类型 | `event` |
| 事件类型 | 虚拟支付相关事件（发货、退款等） |
| 云函数 | `payNotify` |

CLI 方式：

```bash
wechatide -c CodeBuddy cloud_manage_msg_push --appid <appid> --env <envId> \
  --function-name payNotify --action subscribe
```

---

## 云函数说明

| 云函数 | 触发方式 | 入参 | 返回 |
| --- | --- | --- | --- |
| `createOrder` | 前端 `callFunction` | `{ code, productId, buyQuantity }` | `{ ok, data: { mode, signData, paySig, signature, outTradeNo } }` |
| `payNotify` | **平台消息推送**（非前端调用） | 事件对象（含 `Event`、`OpenId`、`OutTradeNo` 等） | `{ ErrCode: 0, ErrMsg: 'success' }` |
| `queryOrder` | 前端 `callFunction` | `{ outTradeNo }` / `{ list: true, statuses }` / `{ goods: true }` | `{ ok, data / orders / goods }` |
| `refundOrder` | 前端 `callFunction` | `{ outTradeNo }` | `{ ok, data: { refundOrderId, leftFee } }` |
| `getUserInfo` | 前端 `callFunction` | 无 | `{ ok, openid }` |

**身份来源**：除 `createOrder` 走 `code2Session` 外，其余通过 `cloud.getWXContext().OPENID` 取当前用户，前端无法伪造。

---

## 数据表字段

### `virtualpay_orders`

| 字段 | 说明 |
| --- | --- |
| `openid` | 下单用户 |
| `outTradeNo` | 业务单号（8-32 位，唯一，不复用） |
| `productId` / `productName` | 商品 |
| `goodsPrice` / `buyQuantity` | 单价（分）、数量 |
| `attach` | 透传数据（JSON 字符串，发货时原样返回） |
| `status` | `pending` / `paid` / `delivered` / `refund_pending` / `refunded` / `closed` |
| `createTime` / `updateTime` | 时间戳 |
| `wxOrderId` | 平台单号（发货后写入，用于幂等） |
| `deliverTime` | 发货时间 |
| `refundOrderId` / `refundWxOrderId` | 退款单号 |
| `refundStartTime` / `refundTime` | 退款时间 |

### `virtualpay_user_goods`

| 字段 | 说明 |
| --- | --- |
| `openid` | 用户 |
| `productId` / `productName` | 道具 |
| `quantity` | 持有数量（累加） |
| `createTime` / `updateTime` | 时间戳 |

---

## 测试

1. 开发者工具编译运行，进入首页
2. 点「购买」→ 拉起支付 → 完成支付（**虚拟支付需真机验证**）
3. 支付成功后预期：
   - `payNotify` 收到推送 → `virtualpay_orders.status` 变 `delivered`
   - `virtualpay_user_goods.quantity` 增加
4. 推送丢失时：
   - 「我的」页下拉刷新，或主动调 `queryOrder` 查单兜底
5. 到云开发控制台核对两个集合的数据变化

---

## 关键点提醒

- 金额单位**全程是分**，不要换算
- `env`：现网 `0`，沙箱 `1`
- `outTradeNo` 每次重新生成、全局唯一、**不能以下划线开头**
- `signData` 是 JSON 字符串，**键顺序固定**；`post_body` 必须与实际请求体完全一致（不格式化、不改顺序）
- 发货以**平台推送为主**、`query_order` 查单兜底；**前端支付回调不作为发货依据**
- 幂等：以平台单号 `wx_order_id`（`WeChatPayInfo.MchOrderNo`）去重
- iOS 端需微信 **8.0.68+**，且需配置小程序简称并开通 IAP

### 沙箱 vs 现网

云函数 `config.js` 通过 `sandbox: true/false` 切换：

| 模式 | AppKey | env | 适用场景 |
| --- | --- | --- | --- |
| 沙箱 | `sandboxAppKey` | `1` | 仅调试；部分环境会被平台拒 |
| **现网**（推荐） | `prodAppKey` | `0` | 真机支付、正式测试、线上使用 |

> ⚠️ `sandbox` 与 `appKey` 必须**成对切换**，否则签名校验失败。真实联调请用现网模式。

### 沙箱能测什么

| 小程序版本 | 沙箱（env=1） | 正式（env=0） |
| --- | --- | --- |
| 开发版 | ✅ | ✅ |
| 体验版 | ✅ | ✅ |
| 正式版 | ❌ | ✅ |

**适合沙箱**：签名算法、下单链路、道具 ID / 价格配置、环境切换逻辑

**不适合沙箱**：正式版发起支付、iOS 完整 IAP 链路

---

## 常见错误速查

| 错误码 / 现象 | 原因 | 解法 |
| --- | --- | --- |
| `COIN_OR_PRODUCT_ID_CREATED_IN_RECENTLY` | 道具刚创建，平台尚未全量同步 | 等待几分钟到半小时后重试 |
| `PAYMENT_ILLEGAL_IN_SANDBOX` | 沙箱模式被平台拦截 | 改用现网模式（`sandbox: false`） |
| `当前商户尚未开启 iOS 支付` | 未配置简称 / 未开通 IAP | 虚拟支付 → 基础配置填简称；基本配置开通 IAP |
| `-502005 database collection not exists` | 集合未创建 | 已内置自动创建兜底 |
| `ACCESS_TOKEN 不存在或已过期` | `code2Session` 失败，AppSecret 错误或配额超限 | 核对 MP 后台的 AppSecret |
| `40013 invalid appid` | appid 错误 | 确认是小程序 appid |
| `40125 invalid appsecret` | secret 错误或被重置 | 重新获取并同步 4 个配置文件 |
| `-604100` | 云函数无法访问外网（`https.get` 出站失败） | 云函数开启固定出口 IP；或改用 `cloud.getWXContext().OPENID` 免掉 `code2Session` |
| `268490003` | `pay_sig` 签名错误 | 检查待签串 `uri + '&' + body` 与 AppKey/环境是否匹配 |

---

## 安全提示

- `appSecret`、`prodAppKey`、`sandboxAppKey` 均为敏感凭证，**只应存在于云函数**
- 小程序前端不出现任何密钥
- 不要将填好真实密钥的代码提交到公开仓库
- 若密钥曾外泄，请到 MP 后台重置

---

## 参考

- [虚拟支付：个人（官方接入指引）](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment/person)
- [虚拟支付：企业、个体户](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/business-capabilities/virtual-payment)
- [查询订单 query_order](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_query_order.html)
- [启动退款 refund_order](https://developers.weixin.qq.com/miniprogram/dev/server/API/VirtualPayment/api_refund_order.html)
- [云开发处理虚拟支付回调](https://developers.weixin.qq.com/minigame/dev/wxcloud/guide/wechatpay/virtual-payment-callback.html)
- [wx.requestVirtualPayment](https://developers.weixin.qq.com/miniprogram/dev/api/payment/wx.requestVirtualPayment.html)

---

> 本项目仅用于学习与联调参考。上线前请自行完成密钥安全加固、订单归属校验与回调来源校验。

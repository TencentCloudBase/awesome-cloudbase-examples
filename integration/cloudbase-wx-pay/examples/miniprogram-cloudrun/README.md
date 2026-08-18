# 微信小程序支付示例（云托管 callContainer 版）

基于 **wx.cloud.callContainer** 调用 CloudBase 云托管（Cloud Run）pay-common 后端的微信小程序支付模板。

## 与云函数版的区别

| 特性 | 云函数版 (`miniprogram/`) | 云托管版（本模板）|
|------|--------------------------|------------------|
| **调用方式** | `wx.cloud.callHTTPFunction` | `wx.cloud.callContainer` |
| **路由分发** | Express 标准路径 `path: '/wx-pay/<action>'` | Express 标准 RESTful 路径 |
| **响应格式** | 直接返回 `{ code, msg, data }` | 直接返回 `{ code, msg, data }` |
| **身份认证** | 平台自动注入 `x-wx-openid` | 平台自动注入 `x-wx-openid` |
| **性能** | 冷启动较慢 | 常驻容器，响应快 |
| **成本** | 按调用次数计费 | 按容器时长计费 |
| **npm 依赖** | 无（使用内置 SDK） | 无（使用内置 SDK） |
| **适用场景** | 低频调用、快速原型 | 高频服务、生产环境 |

## 功能

### 下单支付
- JSAPI 下单 → 调起微信支付 → 支付成功
- 查询订单状态
- 关闭未支付订单（自动检查状态，防止误关已支付订单）
- 申请退款（全额退款，先查询后确认）
- 查询退款进度

### 商家转账
- 发起商家转账（0.3 – 2000 元免密小额）
- 调起 `wx.requestMerchantTransfer` 确认收款页面
- 查询转账单状态

## 前置条件

- ✅ 已将 pay-common 部署到 CloudBase 云托管
- ✅ 微信开发者工具基础库版本 ≥ 3.15.2（`project.config.json` 中已设为 3.15.2）
- ✅ 已完成微信支付商户进件并配置到 pay-common

> 💡 **无需额外配置**：callContainer 模式不需要 CloudBase Auth 身份源、不需要配置服务器域名白名单、不需要 npm 依赖。

## 快速开始

### 1. 修改配置

**`app.js`**：
```javascript
const ENV_ID = 'your-env-id'         // 云开发环境 ID
const SERVICE_NAME = 'pay-common'     // 云托管服务名称
```

**`project.config.json`**：
```json
{
  "appid": "your-appid"
}
```

### 2. 运行

在微信开发者工具中打开项目即可，**无需安装依赖、无需构建 npm**。

## 文件结构

```
miniprogram-cloudrun/
├── app.js                    # 入口：wx.cloud.init() + 全局配置
├── app.json                  # 小程序页面配置
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── sitemap.json
├── README.md                 # 本文档
└── pages/
    └── pay/
        ├── pay.js            # 支付页面逻辑（下单/查单/关单/退款/转账）
        ├── pay.wxml          # 支付页面模板
        └── pay.wxss          # 支付页面样式
```

## 架构说明

```
┌─────────────────┐                          ┌──────────────────┐
│  微信小程序       │   wx.cloud.callContainer  │  云托管容器       │
│  (本模板)        │  ──── POST /wx-pay/* ───→ │  (pay-common)    │
│                 │  ←─── { code, msg, data } │                  │
│  app.js         │                          │  读取 x-wx-openid │
│  └ wx.cloud.init│    平台自动注入 header:     │  调用微信支付 API  │
│                 │    x-wx-openid            │                  │
│  pay.js         │    x-wx-source            │                  │
│  └ callContainer│    x-wx-appid             │                  │
└─────────────────┘                          └──────────────────┘
```

### callContainer 工作原理

1. 前端调用 `wx.cloud.callContainer()`，通过 `X-WX-SERVICE` header 指定目标云托管服务
2. 微信平台自动注入可信 header（`x-wx-openid`、`x-wx-source`、`x-wx-appid`）
3. 后端从 `x-wx-openid` header 直接获取用户身份，**无需前端传入 openid，安全可信，客户端无法伪造**
4. 后端使用 openid 调用微信支付 API

## API 接口

**调用方式**：`wx.cloud.callContainer({ path: '/wx-pay/<action>' })`

| 路径 | 方法 | 说明 |
|------|------|------|
| `/wxpay_order` | POST | JSAPI / 小程序支付下单 |
| `/wxpay_order_h5` | POST | H5 支付下单 |
| `/wxpay_order_native` | POST | Native 扫码支付 |
| `/wxpay_order_app` | POST | APP 支付下单 |
| `/wxpay_query_order_by_out_trade_no` | POST | 查询订单（商户单号） |
| `/wxpay_query_order_by_transaction_id` | POST | 查询订单（微信单号） |
| `/wxpay_close_order` | POST | 关闭订单 |
| `/wxpay_refund` | POST | 申请退款 |
| `/wxpay_refund_query` | POST | 查询退款 |
| `/wxpay_transfer` | POST | 商家转账 |
| `/wxpay_transfer_bill_query` | POST | 查询转账单 |

## 鉴权说明

### callContainer 自动鉴权（推荐）

callContainer 模式下，微信平台自动注入 `x-wx-openid` header，前端无需传入用户身份信息：

```javascript
// 前端 —— 无需传 openid，平台自动注入
wx.cloud.callContainer({
  config: { env: 'your-env-id' },
  path: '/wx-pay/wxpay_order',
  method: 'POST',
  header: {
    'X-WX-SERVICE': 'pay-common',
    'Content-Type': 'application/json',
  },
  data: {
    description: '测试商品',
    amount: { total: 100, currency: 'CNY' },
    // ❌ 不需要传 payer.openid，后端从 x-wx-openid header 自动获取
  },
})
```

```javascript
// 后端 —— 直接读取可信 header
const openid = req.headers['x-wx-openid']
```

> ✅ 相比 Bearer token 方式，callContainer 模式无需登录流程，openid 由平台注入、客户端无法伪造，更安全。

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `wx.cloud.callContainer is not a function` | 基础库版本过低 | 将 `project.config.json` 中 `libVersion` 设为 `3.15.2` 或更高 |
| openid 为空 | 真机未登录微信 / 开发者工具未设置 openid | 真机调试，或在开发者工具设置模拟 openid |
| 调用超时 | 云托管容器未启动 | 检查容器是否正常运行，首次可能需要等待冷启动 |
| 返回 404 | 路径错误或服务名错误 | 检查 `X-WX-SERVICE` 和 `path` 是否正确 |

## 部署检查清单

- [ ] 云托管服务已部署并正常运行
- [ ] 环境变量已配置（`WX_APP_ID`、`WX_MCH_ID` 等）
- [ ] `app.js` 中 `ENV_ID` 已替换为实际环境 ID
- [ ] `project.config.json` 中 `appid` 已替换为小程序 AppID
- [ ] 微信支付回调地址已配置为云托管域名

## 注意事项

- ⚠️ **金额安全**：示例中金额取自前端输入，仅供测试。**生产环境必须从后端数据库查询金额**。
- 商家转账 ≥ 2000 元需实现 `user_name` RSA 加密，本模板仅支持免密小额。
- 启动时若 `ENV_ID` 未修改，会弹出配置未完成的提示。
- 基础库要求 ≥ 3.15.2。

## 相关文档

- [wx.cloud.callContainer 文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/reference-sdk-api/container/Cloud.callContainer.html)
- [CloudBase 云托管文档](https://docs.cloudbase.net/run/intro.html)
- [微信支付 API v3](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)

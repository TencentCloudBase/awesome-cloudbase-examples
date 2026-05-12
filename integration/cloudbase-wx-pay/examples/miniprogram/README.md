# 微信小程序支付示例（云函数版）

基于 **wx.cloud.callHTTPFunction** 调用 CloudBase HTTP 云函数 pay-common 后端的微信小程序支付模板。

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

- ✅ 已开通腾讯云 CloudBase（TCB）环境
- ✅ 已将 pay-common 部署为 HTTP 云函数
- ✅ 已完成微信支付商户进件并配置到 pay-common
- ✅ 微信小程序基础库版本 ≥ 3.15.2

> 💡 **无需额外配置**：callHTTPFunction 模式不需要 CloudBase Auth 身份源、不需要 npm 依赖、不需要构建 npm。平台自动注入 `x-wx-openid`，开箱即用。

## 快速开始

### 1. 修改配置

所有"每次部署可能变化"的配置都集中在 **`app.js` 顶部**，照着改即可，无需到处搜索替换：

**`app.js`**：
```javascript
const ENV_ID = 'YOUR_ENV_ID'        // ① 替换为你的云开发环境 ID
const FUNCTION_NAME = 'pay-common'  // ② 你部署的 HTTP 云函数名称（默认 pay-common，
                                    //    如果 cloudbaserc.json 里改了名字，这里也要改）
```

**`project.config.json`**：
```json
{
  "appid": "your-appid"               // ③ 替换为你的小程序 AppID
}
```

> 配置项说明：
> - `ENV_ID`：CloudBase 控制台 → 环境概览 → 环境 ID
> - `FUNCTION_NAME`：与 `pay-common/cloudbaserc.json` 里 `functions[].name` 保持一致
> - 小程序 AppID：微信公众平台 → 开发管理 → 开发设置

### 2. 运行

在微信开发者工具中打开项目即可，**无需安装依赖、无需构建 npm**。

## 文件结构

```
miniprogram/
├── app.js                    # 入口：wx.cloud.init() + 全局配置
├── app.json                  # 小程序页面配置
├── app.wxss                  # 全局样式
├── project.config.json       # 微信开发者工具项目配置
├── project.private.config.json
├── sitemap.json
└── pages/
    └── pay/
        ├── pay.js            # 支付页面逻辑（下单/查单/关单/退款/转账）
        ├── pay.wxml          # 支付页面模板
        └── pay.wxss          # 支付页面样式
```

## 架构说明

```
┌─────────────────┐                              ┌──────────────────┐
│  微信小程序       │  wx.cloud.callHTTPFunction    │  HTTP 云函数       │
│  (本模板)        │  ──── POST /wx-pay/* ──────→ │  (pay-common)     │
│                 │  ←─── { code, msg, data }    │                  │
│  app.js         │                              │  读取 x-wx-openid │
│  └ wx.cloud.init│    平台自动注入 header:         │  调用微信支付 API  │
│                 │    x-wx-openid               │                  │
│  pay.js         │    x-wx-source               │                  │
│  └ callHTTPFunc │    x-wx-appid                │                  │
└─────────────────┘                              └──────────────────┘
```

### callHTTPFunction 工作原理

1. 前端调用 `wx.cloud.callHTTPFunction()`，通过 `name` 指定目标 HTTP 云函数
2. 微信平台自动注入可信 header（`x-wx-openid`、`x-wx-source`、`x-wx-appid`）
3. 后端从 `x-wx-openid` header 直接获取用户身份，**无需前端传入 openid，安全可信，客户端无法伪造**
4. 后端使用 openid 调用微信支付 API

## API 接口

**调用方式**：`wx.cloud.callHTTPFunction({ name: 'pay-common', path: '/wx-pay/<action>' })`

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

### callHTTPFunction 自动鉴权（推荐）

callHTTPFunction 模式下，微信平台自动注入 `x-wx-openid` header，前端无需传入用户身份信息：

```javascript
// 前端 —— 无需传 openid，平台自动注入
wx.cloud.callHTTPFunction({
  name: 'pay-common',
  config: { env: 'your-env-id' },
  path: '/wx-pay/wxpay_order',
  method: 'POST',
  header: { 'Content-Type': 'application/json' },
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

> ✅ 相比旧的 Bearer Token 方式，callHTTPFunction 模式无需登录流程、无需 SDK 依赖，openid 由平台注入、客户端无法伪造，更简单更安全。

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `wx.cloud.callHTTPFunction is not a function` | 基础库版本过低 | 将 `project.config.json` 中 `libVersion` 设为 `3.15.2` 或更高 |
| openid 为空 | 真机未登录微信 / 开发者工具未设置 openid | 真机调试，或在开发者工具设置模拟 openid |
| 调用超时 | 云函数冷启动 | 首次调用可能需要等待几秒 |
| 返回 404 | 路径或函数名错误 | 检查 `name` 和 `path` 是否正确 |

## 部署检查清单

- [ ] HTTP 云函数已部署并正常运行
- [ ] 环境变量已配置（`WX_APP_ID`、`WX_MCH_ID` 等）
- [ ] `app.js` 中 `ENV_ID` 已替换为实际环境 ID
- [ ] `project.config.json` 中 `appid` 已替换为小程序 AppID
- [ ] 微信支付回调地址已配置（通过 HTTP 访问服务）

## 注意事项

- ⚠️ **金额安全**：示例中金额取自前端输入，仅供测试。**生产环境必须从后端数据库查询金额**。
- ⚠️ **商家转账需要固定 IP**：微信支付要求商家转账接口的调用方具有固定出口 IP，需在商户平台 → 产品中心 → 商家转账中配置 IP 白名单。CloudBase 云函数需开通**固定 IP** 功能。
- 商家转账 ≥ 2000 元需实现 `user_name` RSA 加密，本模板仅支持免密小额。
- 启动时若 `ENV_ID` 未修改，会弹出配置未完成的提示。

## 相关文档

- [wx.cloud.callHTTPFunction 文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/reference-sdk-api/functions/Cloud.callFunction.html)
- [CloudBase 云函数文档](https://docs.cloudbase.net/cloud-function/introduce.html)
- [微信支付 API v3](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
